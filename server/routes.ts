import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { SmsService } from "./services/sms";
import { TelegramService } from "./services/telegram";
import { ReportService } from "./services/report";
import { generateTelegramMessage } from "./services/telegram-message";
import { scrapeTourSource } from "./services/scraping";
import { SkyroScraper } from "./services/skyro-scraper";
import fileUpload, { UploadedFile } from "express-fileupload";

// حذف تعریف interface چون با تایپ های express-fileupload تداخل دارد
import { 
  insertRequestSchema, 
  insertSmsTemplateSchema, 
  insertSmsHistorySchema,
  insertTelegramConfigSchema,
  insertBackupSettingsSchema,
  insertCustomerRequestSchema,
  insertSystemLogSchema,
  insertSmsSettingsSchema,
  insertTourDestinationSchema,
  insertTourSourceSchema,
  insertTourBrandSchema,
  insertTourBrandRequestSchema,
  insertTourSettingsSchema,
  insertTourHistorySchema,
  insertTourLogSchema
} from "@shared/schema";
import { z } from "zod";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // تنظیم middleware برای آپلود فایل
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // محدودیت 10 مگابایت
    useTempFiles: true,
    tempFileDir: './temp/'
  }));
  
  // API routes
  // Requests routes
  app.get("/api/requests", isAuthenticated, async (req, res, next) => {
    try {
      const { search } = req.query;
      
      // اگر پارامتر جستجو ارسال شده بود، درخواست‌ها را فیلتر کنیم
      if (search && typeof search === 'string') {
        const searchQuery = search.trim().toLowerCase();
        const allRequests = await storage.getRequests();
        
        // جستجو بر اساس شماره بلیط، نام مشتری یا شماره تماس
        const filteredRequests = allRequests.filter(request => 
          request.ticketNumber?.toLowerCase().includes(searchQuery) ||
          request.customerName?.toLowerCase().includes(searchQuery) ||
          request.phoneNumber?.toLowerCase().includes(searchQuery)
        );
        
        return res.json(filteredRequests);
      }
      
      // در غیر این صورت، تمام درخواست‌ها را برگردان
      const requests = await storage.getRequests();
      res.json(requests);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/requests/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getRequestById(id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/requests", async (req, res, next) => {
    try {
      const validation = insertRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }
      
      const request = await storage.createRequest(validation.data);
      
      // اگر تلگرام فعال است، پیام درخواست جدید به کانال ارسال کن
      const telegramConfig = await storage.getTelegramConfig();
      if (telegramConfig && telegramConfig.isActive) {
        try {
          // آماده‌سازی متن پیام با استفاده از قالب ذخیره شده
          let messageText = telegramConfig.messageFormat;
          
          if (!messageText) {
            // اگر قالب پیام تنظیم نشده باشد، از یک قالب پیش‌فرض استفاده می‌کنیم
            messageText = `🔔 درخواست جدید دریافت شد

👤 مشتری: {customer_name}
📱 شماره تماس: {phone_number}
📝 نوع درخواست: {request_type}
💰 مبلغ: {amount}

📆 زمان ثبت: {submit_time}`;
          }
          
          // تبدیل نوع درخواست به فارسی
          let requestTypeText = request.requestType === 'refund' ? 'استرداد وجه' : 'پرداخت';
          
          // جایگزینی مقادیر پویا
          messageText = messageText
            .replace(/{customer_name}/g, request.customerName)
            .replace(/{phone_number}/g, request.phoneNumber)
            .replace(/{request_type}/g, requestTypeText)
            .replace(/{amount}/g, 'نامشخص')
            .replace(/{submit_time}/g, new Date().toLocaleString('fa-IR'));
          
          // ارسال پیام به کانال تلگرام
          const result = await TelegramService.sendMessage(
            messageText,
            request.id,
            request.customerName,
            request.requestType
          );
          
          // ثبت تاریخچه پیام تلگرام
          await storage.createTelegramHistory({
            requestId: request.id,
            customerName: request.customerName,
            requestType: request.requestType,
            status: result.status ? "sent" : "failed"
          });
          
          // ثبت لاگ سیستم
          if (result.status) {
            await storage.createSystemLog({
              level: 'info',
              message: `پیام درخواست جدید به کانال تلگرام ارسال شد`,
              module: 'telegram-service',
              details: { requestId: request.id, customer: request.customerName }
            });
          } else {
            throw new Error(result.message);
          }
        } catch (telegramError) {
          console.error('Error sending telegram message:', telegramError);
          // در صورت خطا، لاگ ثبت کن ولی اجازه بده درخواست ادامه پیدا کند
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیام به تلگرام: ${telegramError instanceof Error ? telegramError.message : 'خطای ناشناخته'}`,
            module: 'telegram-service',
            details: { requestId: request.id }
          });
          
          // ثبت در تاریخچه تلگرام با وضعیت خطا
          await storage.createTelegramHistory({
            requestId: request.id,
            customerName: request.customerName,
            requestType: request.requestType,
            status: "failed"
          });
        }
      }
      
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/requests/:id/status", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const statusSchema = z.object({ 
        status: z.enum(["pending", "approved", "rejected"]),
        smsTemplate: z.string().optional(), // اضافه کردن فیلد اختیاری برای الگوی پیامک
        sendSms: z.boolean().default(false) // آیا پیامک ارسال شود؟
      });
      
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid status", errors: validation.error.errors });
      }
      
      const request = await storage.updateRequestStatus(id, validation.data.status);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // ارسال پیامک اگر کاربر درخواست داده باشد
      if (validation.data.sendSms && request.phoneNumber) {
        try {
          const smsTemplates = await storage.getSmsTemplates();
          let template;
          
          if (validation.data.smsTemplate && validation.data.smsTemplate !== "default") {
            // استفاده از الگوی انتخاب شده توسط کاربر
            template = smsTemplates.find(t => t.name === validation.data.smsTemplate);
          } else {
            // استفاده از الگوی پیش‌فرض بر اساس وضعیت
            if (validation.data.status === "approved") {
              template = smsTemplates.find(t => t.name === "تایید درخواست");
            } else if (validation.data.status === "rejected") {
              template = smsTemplates.find(t => t.name === "رد درخواست");
            }
          }
          
          if (template) {
            // ارسال پیامک از طریق سرویس AmootSMS
            await SmsService.sendSms(request.phoneNumber, template.content, request.id);
            
            // ثبت لاگ سیستم
            await storage.createSystemLog({
              level: 'info',
              message: `پیامک وضعیت به شماره ${request.phoneNumber} ارسال شد`,
              module: 'sms-service',
              details: { templateName: template.name, requestId: request.id }
            });
          } else {
            // اگر الگو یافت نشد
            await storage.createSystemLog({
              level: 'warning',
              message: `الگوی پیامک مورد نظر یافت نشد`,
              module: 'sms-service',
              details: { templateName: validation.data.smsTemplate, requestId: request.id }
            });
          }
        } catch (smsError) {
          console.error('Error sending status update SMS:', smsError);
          // ثبت خطا در لاگ‌های سیستم
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیامک وضعیت به شماره ${request.phoneNumber}`,
            module: 'sms-service',
            details: { error: smsError instanceof Error ? smsError.message : 'خطای ناشناخته', requestId: request.id }
          });
        }
      }
      
      // ارسال اطلاعیه به کانال تلگرام در صورت تغییر وضعیت
      const telegramConfig = await storage.getTelegramConfig();
      if (telegramConfig && telegramConfig.isActive) {
        try {
          // متن وضعیت به فارسی
          let statusText = 'نامشخص';
          if (validation.data.status === 'approved') {
            statusText = 'تایید شده ✅';
          } else if (validation.data.status === 'rejected') {
            statusText = 'رد شده ❌';
          } else if (validation.data.status === 'pending') {
            statusText = 'در حال بررسی 🔍';
          }
          
          // تبدیل نوع درخواست به فارسی
          let requestTypeText = request.requestType === 'refund' ? 'استرداد وجه' : 'پرداخت';
          
          // آماده‌سازی پیام تغییر وضعیت
          const messageText = `🔔 بروزرسانی وضعیت درخواست

👤 مشتری: ${request.customerName}
📱 شماره موبایل: ${request.phoneNumber}
📝 نوع درخواست: ${requestTypeText}
💰 مبلغ: نامشخص
📊 وضعیت جدید: ${statusText}

📆 زمان تغییر وضعیت: ${new Date().toLocaleString('fa-IR')}`;
          
          // ارسال پیام به کانال تلگرام
          const result = await TelegramService.sendMessage(
            messageText,
            request.id,
            request.customerName,
            request.requestType
          );
          
          // ثبت لاگ سیستم
          if (result.status) {
            await storage.createSystemLog({
              level: 'info',
              message: `پیام تغییر وضعیت به کانال تلگرام ارسال شد`,
              module: 'telegram-service',
              details: { requestId: request.id, status: validation.data.status }
            });
          } else {
            throw new Error(result.message);
          }
        } catch (telegramError) {
          console.error('Error sending telegram status update message:', telegramError);
          // در صورت خطا، لاگ ثبت می‌کنیم ولی ادامه می‌دهیم
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیام تغییر وضعیت به تلگرام: ${telegramError instanceof Error ? telegramError.message : 'خطای ناشناخته'}`,
            module: 'telegram-service',
            details: { requestId: request.id, status: validation.data.status }
          });
        }
      }
      
      res.json(request);
    } catch (error) {
      next(error);
    }
  });
  
  // مسیرهای الگوی پیامک حذف شده‌اند زیرا در مسیرهای جدید پیاده‌سازی شده‌اند
  
  // مسیرهای API پیامک
  app.get("/api/sms/templates", isAuthenticated, async (req, res, next) => {
    try {
      const templates = await storage.getSmsTemplates();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/sms/templates", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertSmsTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات الگوی پیامک معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const template = await storage.createSmsTemplate(validation.data);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/sms/templates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateSmsTemplate(id, req.body);
      if (!template) {
        return res.status(404).json({ message: "الگوی پیامک یافت نشد" });
      }
      res.json(template);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/sms/templates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSmsTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "الگوی پیامک یافت نشد" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/sms/history", isAuthenticated, async (req, res, next) => {
    try {
      const history = await storage.getSmsHistory();
      res.json(history);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/sms/send", isAuthenticated, async (req, res, next) => {
    try {
      const smsSchema = z.object({
        phoneNumber: z.string().min(10),
        content: z.string().min(1).max(160),
        requestId: z.number().nullable().optional(),
      });
      
      const validation = smsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات پیامک معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      // ارسال پیامک از طریق سرویس AmootSMS
      const { phoneNumber, content, requestId } = validation.data;
      const result = await SmsService.sendSms(phoneNumber, content, requestId || undefined);
      
      if (result.status) {
        res.status(200).json({
          success: true,
          message: result.message,
          messageId: result.messageId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in sending SMS:', error);
      next(error);
    }
  });
  
  // Telegram Config routes
  app.get("/api/telegram-config", isAuthenticated, async (req, res, next) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config) {
        return res.status(404).json({ message: "Telegram config not found" });
      }
      res.json(config);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/telegram-config/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.updateTelegramConfig(id, req.body);
      if (!config) {
        return res.status(404).json({ message: "Telegram config not found" });
      }
      res.json(config);
    } catch (error) {
      next(error);
    }
  });
  
  // API برای ارسال پیام به تلگرام
  app.post("/api/telegram/send", isAuthenticated, async (req, res, next) => {
    try {
      const telegramSchema = z.object({
        message: z.string().min(1),
        requestId: z.number().nullable().optional(),
        customerName: z.string().optional(),
        requestType: z.string().optional(),
      });
      
      const validation = telegramSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات پیام تلگرام معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const { message, requestId, customerName, requestType } = validation.data;
      const result = await TelegramService.sendMessage(
        message, 
        requestId || undefined,
        customerName || '',
        requestType || ''
      );
      
      if (result.status) {
        res.status(200).json({
          success: true,
          message: result.message,
          messageId: result.messageId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in sending Telegram message:', error);
      next(error);
    }
  });

  // Telegram History routes
  app.get("/api/telegram-history", isAuthenticated, async (req, res, next) => {
    try {
      const history = await storage.getTelegramHistory();
      res.json(history);
    } catch (error) {
      next(error);
    }
  });
  
  // Backup History routes
  app.get("/api/backup-history", isAuthenticated, async (req, res, next) => {
    try {
      const history = await storage.getBackupHistory();
      res.json(history);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/backup", isAuthenticated, async (req, res, next) => {
    try {
      // استفاده از سرویس بک‌آپ برای تهیه و ارسال بک‌آپ
      const { BackupService } = await import('./services/backup');
      const backupResult = await BackupService.createAndSendBackup('manual');
      
      if (!backupResult.success) {
        return res.status(500).json({ 
          message: backupResult.message,
          success: false
        });
      }
      
      // دریافت بک‌آپ ایجاد شده از دیتابیس
      const history = await storage.getBackupHistory();
      const latestBackup = history
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      res.status(201).json(latestBackup);
    } catch (error) {
      console.error("Error creating manual backup:", error);
      next(error);
    }
  });
  
  app.delete("/api/backup-history/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBackupHistory(id);
      if (!success) {
        return res.status(404).json({ message: "Backup history not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // Backup Settings routes
  app.get("/api/backup-settings", isAuthenticated, async (req, res, next) => {
    try {
      const settings = await storage.getBackupSettings();
      if (!settings) {
        return res.status(404).json({ message: "Backup settings not found" });
      }
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/backup-settings/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const settings = await storage.updateBackupSettings(id, req.body);
      if (!settings) {
        return res.status(404).json({ message: "Backup settings not found" });
      }
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  // API برای ارسال گزارش آماری به کانال تلگرام
  app.post("/api/reports/send", isAuthenticated, async (req, res, next) => {
    try {
      const success = await ReportService.sendReportToTelegram();
      
      if (success) {
        res.status(200).json({
          success: true,
          message: "گزارش آماری با موفقیت به کانال تلگرام ارسال شد"
        });
      } else {
        res.status(400).json({
          success: false,
          message: "خطا در ارسال گزارش آماری به تلگرام"
        });
      }
    } catch (error) {
      console.error('Error sending report to Telegram:', error);
      next(error);
    }
  });
  
  // تابع تولید کد پیگیری تصادفی
  function generateTrackingCode() {
    // ایجاد یک کد 8 رقمی تصادفی
    const min = 10000000;
    const max = 99999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // بررسی تکراری بودن شماره واچر
  app.get("/api/check-voucher/:voucherNumber", async (req, res, next) => {
    try {
      const voucherNumber = req.params.voucherNumber;
      const existingRequest = await storage.getCustomerRequestByVoucherNumber(voucherNumber);
      
      if (existingRequest) {
        return res.status(409).json({ 
          exists: true, 
          message: "این شماره واچر قبلاً ثبت شده است" 
        });
      }
      
      return res.status(200).json({ exists: false });
    } catch (error) {
      next(error);
    }
  });

  // Customer Request routes
  app.post("/api/customer-requests", async (req, res, next) => {
    try {
      const validation = insertCustomerRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "اطلاعات درخواست معتبر نیست", errors: validation.error.errors });
      }
      
      // بررسی تکراری بودن شماره واچر
      const existingRequest = await storage.getCustomerRequestByVoucherNumber(validation.data.voucherNumber);
      if (existingRequest) {
        return res.status(409).json({ 
          message: "این شماره واچر قبلاً ثبت شده است" 
        });
      }
      
      // تولید کد پیگیری
      const trackingCode = generateTrackingCode();
      
      // ایجاد درخواست با کد پیگیری
      const requestData = {
        ...validation.data,
        trackingCode
      };
      
      const request = await storage.createCustomerRequest(requestData);
      
      // اگر تلگرام فعال است، پیام درخواست جدید به کانال ارسال کن
      const telegramConfig = await storage.getTelegramConfig();
      if (telegramConfig && telegramConfig.isActive) {
        try {
          // آماده‌سازی متن پیام با استفاده از قالب ذخیره شده
          let messageText = telegramConfig.messageFormat;
          
          // جایگزینی مقادیر پویا
          messageText = messageText
            .replace(/{customer_name}/g, request.accountOwner)
            .replace(/{phone_number}/g, request.phoneNumber)
            .replace(/{ticket_number}/g, request.voucherNumber)
            .replace(/{tracking_code}/g, request.trackingCode)
            .replace(/{request_type}/g, 'استرداد وجه')
            .replace(/{description}/g, request.description || 'بدون توضیحات');
          
          // ارسال پیام به کانال تلگرام
          const result = await TelegramService.sendMessage(
            messageText,
            request.id,
            request.accountOwner,
            'refund'
          );
          
          // ثبت لاگ سیستم
          if (result.status) {
            await storage.createSystemLog({
              level: 'info',
              message: `پیام درخواست جدید به کانال تلگرام ارسال شد`,
              module: 'telegram-service',
              details: { requestId: request.id, customer: request.accountOwner }
            });
          } else {
            throw new Error(result.message);
          }
        } catch (telegramError) {
          console.error('Error sending telegram message:', telegramError);
          // در صورت خطا، لاگ ثبت کن ولی اجازه بده درخواست ادامه پیدا کند
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیام به تلگرام: ${telegramError instanceof Error ? telegramError.message : 'خطای ناشناخته'}`,
            module: 'telegram-service',
            details: { requestId: request.id }
          });
          
          // ثبت در تاریخچه تلگرام با وضعیت خطا
          await storage.createTelegramHistory({
            requestId: request.id,
            customerName: request.accountOwner,
            requestType: "refund",
            status: "failed"
          });
        }
      }
      
      // ارسال پیامک تاییدیه
      const smsTemplates = await storage.getSmsTemplates();
      const pendingTemplate = smsTemplates.find(t => t.name === "در حال بررسی");
      if (pendingTemplate) {
        try {
          // افزودن کد پیگیری به متن پیامک
          const messageWithTracking = pendingTemplate.content + `\n\nکد پیگیری شما: ${trackingCode}`;
          
          // ارسال پیامک از طریق سرویس AmootSMS
          await SmsService.sendSms(request.phoneNumber, messageWithTracking, request.id);
        } catch (smsError) {
          console.error('Error sending confirmation SMS:', smsError);
          // در صورت خطا، فقط لاگ می‌کنیم و اجازه می‌دهیم درخواست ادامه یابد
        }
      }
      
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/customer-requests", async (req, res, next) => {
    try {
      // چک کردن احراز هویت کاربر
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "برای مشاهده درخواست‌های مشتریان نیاز است ابتدا وارد حساب کاربری خود شوید" });
      }
      
      const { search } = req.query;
      
      // اگر پارامتر جستجو ارسال شده بود، درخواست‌ها را فیلتر کنیم
      if (search && typeof search === 'string') {
        const searchQuery = search.trim().toLowerCase();
        const allRequests = await storage.getCustomerRequests();
        
        // جستجو بر اساس کد پیگیری، شماره واچر یا شماره موبایل
        const filteredRequests = allRequests.filter(request => 
          request.trackingCode?.toLowerCase().includes(searchQuery) || 
          request.voucherNumber?.toLowerCase().includes(searchQuery) ||
          request.phoneNumber?.toLowerCase().includes(searchQuery) ||
          request.accountOwner?.toLowerCase().includes(searchQuery)
        );
        
        return res.json(filteredRequests);
      }
      
      // در غیر این صورت، تمام درخواست‌ها را برگردان
      const requests = await storage.getCustomerRequests();
      res.json(requests);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/customer-requests/:id", async (req, res, next) => {
    try {
      // چک کردن احراز هویت کاربر
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "برای مشاهده جزئیات درخواست نیاز است ابتدا وارد حساب کاربری خود شوید" });
      }
      
      const id = parseInt(req.params.id);
      const request = await storage.getCustomerRequestById(id);
      if (!request) {
        return res.status(404).json({ message: "درخواست مورد نظر یافت نشد" });
      }
      res.json(request);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/customer-requests/:id/status", async (req, res, next) => {
    try {
      // چک کردن احراز هویت کاربر
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "برای تغییر وضعیت درخواست نیاز است ابتدا وارد حساب کاربری خود شوید" });
      }
      
      const id = parseInt(req.params.id);
      const statusSchema = z.object({ 
        status: z.enum(["pending", "approved", "rejected"]),
        smsTemplate: z.string().optional(), // اضافه کردن فیلد اختیاری برای الگوی پیامک
        sendSms: z.boolean().default(true) // به صورت پیش‌فرض پیامک ارسال شود
      });
      
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "وضعیت نامعتبر است", errors: validation.error.errors });
      }
      
      const request = await storage.updateCustomerRequestStatus(id, validation.data.status);
      if (!request) {
        return res.status(404).json({ message: "درخواست مورد نظر یافت نشد" });
      }
      
      // ارسال پیامک اگر کاربر درخواست داده باشد
      if (validation.data.sendSms && request.phoneNumber) {
        try {
          const smsTemplates = await storage.getSmsTemplates();
          let template;
          
          if (validation.data.smsTemplate && validation.data.smsTemplate !== "default") {
            // استفاده از الگوی انتخاب شده توسط کاربر
            template = smsTemplates.find(t => t.name === validation.data.smsTemplate);
          } else {
            // استفاده از الگوی پیش‌فرض بر اساس وضعیت
            if (validation.data.status === "approved") {
              template = smsTemplates.find(t => t.name === "تایید درخواست");
            } else if (validation.data.status === "rejected") {
              template = smsTemplates.find(t => t.name === "رد درخواست");
            } else if (validation.data.status === "pending") {
              template = smsTemplates.find(t => t.name === "در حال بررسی");
            }
          }
          
          if (template) {
            // ارسال پیامک از طریق سرویس AmootSMS
            await SmsService.sendSms(request.phoneNumber, template.content, request.id);
            
            // ثبت لاگ سیستم
            await storage.createSystemLog({
              level: 'info',
              message: `پیامک وضعیت به شماره ${request.phoneNumber} ارسال شد`,
              module: 'sms-service',
              details: { templateName: template.name, requestId: request.id }
            });
          } else {
            // اگر الگو یافت نشد
            await storage.createSystemLog({
              level: 'warning',
              message: `الگوی پیامک مورد نظر یافت نشد`,
              module: 'sms-service',
              details: { templateName: validation.data.smsTemplate, requestId: request.id }
            });
          }
        } catch (smsError) {
          console.error('Error sending status update SMS:', smsError);
          // ثبت خطا در لاگ‌های سیستم
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیامک وضعیت به شماره ${request.phoneNumber}`,
            module: 'sms-service',
            details: { error: smsError instanceof Error ? smsError.message : 'خطای ناشناخته', requestId: request.id }
          });
        }
      }
      
      // ارسال اطلاعیه به کانال تلگرام در صورت تغییر وضعیت
      const telegramConfig = await storage.getTelegramConfig();
      if (telegramConfig && telegramConfig.isActive) {
        try {
          // متن وضعیت به فارسی
          let statusText = 'نامشخص';
          if (validation.data.status === 'approved') {
            statusText = 'تایید شده ✅';
          } else if (validation.data.status === 'rejected') {
            statusText = 'رد شده ❌';
          } else if (validation.data.status === 'pending') {
            statusText = 'در حال بررسی 🔍';
          }
          
          // آماده‌سازی پیام تغییر وضعیت
          const messageText = `🔔 بروزرسانی وضعیت درخواست

🎫 شماره واچر: ${request.voucherNumber}
🔢 کد پیگیری: ${request.trackingCode}
👤 مشتری: ${request.accountOwner}
📱 شماره موبایل: ${request.phoneNumber}
📊 وضعیت جدید: ${statusText}

📆 زمان تغییر وضعیت: ${new Date().toLocaleString('fa-IR')}`;
          
          // ارسال پیام به کانال تلگرام
          const result = await TelegramService.sendMessage(
            messageText,
            request.id,
            request.accountOwner,
            'status_update'
          );
          
          // ثبت لاگ سیستم
          if (result.status) {
            await storage.createSystemLog({
              level: 'info',
              message: `پیام تغییر وضعیت به کانال تلگرام ارسال شد`,
              module: 'telegram-service',
              details: { requestId: request.id, status: validation.data.status }
            });
          } else {
            throw new Error(result.message);
          }
        } catch (telegramError) {
          console.error('Error sending telegram status update message:', telegramError);
          // در صورت خطا، لاگ ثبت می‌کنیم ولی ادامه می‌دهیم
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیام تغییر وضعیت به تلگرام: ${telegramError instanceof Error ? telegramError.message : 'خطای ناشناخته'}`,
            module: 'telegram-service',
            details: { requestId: request.id, status: validation.data.status }
          });
        }
      }
      
      res.json(request);
    } catch (error) {
      next(error);
    }
  });

  // تنظیمات پیامک
  app.get("/api/sms/settings", isAuthenticated, async (req, res, next) => {
    try {
      const settings = await storage.getSmsSettings();
      res.json(settings || {});
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/sms/settings", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertSmsSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات تنظیمات پیامک معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      // ابتدا چک می‌کنیم آیا تنظیمات وجود دارد
      const existingSettings = await storage.getSmsSettings();
      let settings;
      
      if (existingSettings) {
        // به‌روزرسانی تنظیمات موجود
        settings = await storage.updateSmsSettings(existingSettings.id, validation.data);
      } else {
        // ایجاد تنظیمات جدید
        settings = await storage.createSmsSettings(validation.data);
      }
      
      res.status(201).json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  // مسیرهای مدیریت لاگ‌های سیستم
  // API برای ایمپورت بک‌آپ
  app.post("/api/import-backup", isAuthenticated, async (req, res, next) => {
    try {
      // بررسی اینکه آیا فایل بک‌آپ در درخواست وجود دارد
      if (!req.files || !req.files.backupFile) {
        return res.status(400).json({
          success: false,
          message: "لطفا فایل بک‌آپ را انتخاب کنید"
        });
      }
      
      // اگر چندین فایل آپلود شده باشد، فقط اولی را در نظر می‌گیریم
      const backupFile = Array.isArray(req.files.backupFile) 
        ? req.files.backupFile[0] 
        : req.files.backupFile;
      
      // بررسی نوع فایل
      if (backupFile.mimetype !== 'application/json') {
        return res.status(400).json({
          success: false,
          message: "فرمت فایل نامعتبر است. لطفا فایل JSON انتخاب کنید"
        });
      }
      
      // استفاده از سرویس بک‌آپ برای وارد کردن بک‌آپ
      const { BackupService } = await import('./services/backup');
      const importResult = await BackupService.importBackup(backupFile.data);
      
      res.json(importResult);
    } catch (error) {
      console.error('خطا در وارد کردن بک‌آپ:', error);
      
      // ثبت لاگ خطا
      await storage.createSystemLog({
        level: 'error',
        message: `خطا در وارد کردن بک‌آپ: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`
      });
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در وارد کردن بک‌آپ'
      });
    }
  });
  
  app.get("/api/system-logs", isAuthenticated, async (req, res, next) => {
    try {
      const logs = await storage.getSystemLogs();
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/system-logs", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertSystemLogSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات لاگ معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const log = await storage.createSystemLog(validation.data);
      res.status(201).json(log);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/system-logs/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSystemLog(id);
      if (!success) {
        return res.status(404).json({ message: "لاگ مورد نظر یافت نشد" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/system-logs", isAuthenticated, async (req, res, next) => {
    try {
      const success = await storage.clearSystemLogs();
      if (!success) {
        return res.status(500).json({ message: "خطا در پاک کردن لاگ‌ها" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // API برای کنترل زمان‌بندی بک‌آپ
  app.post("/api/backup/schedule", isAuthenticated, async (req, res, next) => {
    try {
      const { active } = req.body;
      
      // دریافت تنظیمات فعلی
      const currentSettings = await storage.getBackupSettings();
      if (!currentSettings) {
        return res.status(404).json({ message: "تنظیمات بک‌آپ یافت نشد" });
      }
      
      // به‌روزرسانی وضعیت فعال بودن
      const updatedSettings = await storage.updateBackupSettings(currentSettings.id, {
        isActive: active
      });
      
      if (!updatedSettings) {
        return res.status(500).json({ message: "خطا در به‌روزرسانی تنظیمات بک‌آپ" });
      }
      
      // راه‌اندازی مجدد زمان‌بندی بک‌آپ
      const { SchedulerService } = await import("./services/scheduler");
      await SchedulerService.startBackupScheduler();
      
      // ثبت لاگ
      await storage.createSystemLog({
        level: 'info',
        message: `زمان‌بندی بک‌آپ ${active ? 'فعال' : 'غیرفعال'} شد`,
        module: 'backup-service',
        details: { isActive: active }
      });
      
      res.status(200).json({ 
        message: `زمان‌بندی بک‌آپ با موفقیت ${active ? 'فعال' : 'غیرفعال'} شد`,
        settings: updatedSettings 
      });
    } catch (error) {
      next(error);
    }
  });

  // Tour Destinations routes
  app.get("/api/tour-destinations", isAuthenticated, async (req, res, next) => {
    try {
      const destinations = await storage.getTourDestinations();
      res.json(destinations);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/tour-destinations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const destination = await storage.getTourDestinationById(id);
      if (!destination) {
        return res.status(404).json({ message: "مقصد گردشگری یافت نشد" });
      }
      res.json(destination);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/tour-destinations", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertTourDestinationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات مقصد گردشگری معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const destination = await storage.createTourDestination(validation.data);
      
      // Log creation
      await storage.createSystemLog({
        level: 'info',
        message: `مقصد گردشگری جدید ایجاد شد: ${destination.name}`,
        module: 'tour-management',
        details: { destinationId: destination.id }
      });
      
      res.status(201).json(destination);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/tour-destinations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the update data
      const updateSchema = z.object({
        name: z.string().optional(),
        active: z.boolean().optional()
      });
      
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات بروزرسانی معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const destination = await storage.updateTourDestination(id, validation.data);
      if (!destination) {
        return res.status(404).json({ message: "مقصد گردشگری یافت نشد" });
      }
      
      // Log update
      await storage.createSystemLog({
        level: 'info',
        message: `مقصد گردشگری بروزرسانی شد: ${destination.name}`,
        module: 'tour-management',
        details: { 
          destinationId: destination.id,
          changes: validation.data
        }
      });
      
      res.json(destination);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/tour-destinations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get the destination to log its name
      const destination = await storage.getTourDestinationById(id);
      if (!destination) {
        return res.status(404).json({ message: "مقصد گردشگری یافت نشد" });
      }
      
      const success = await storage.deleteTourDestination(id);
      if (!success) {
        return res.status(404).json({ message: "مقصد گردشگری یافت نشد" });
      }
      
      // Log deletion
      await storage.createSystemLog({
        level: 'warning',
        message: `مقصد گردشگری حذف شد: ${destination.name}`,
        module: 'tour-management',
        details: { destinationId: id }
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // Tour Brands routes
  app.get("/api/tour-brands", isAuthenticated, async (req, res, next) => {
    try {
      const brands = await storage.getTourBrands();
      res.json(brands);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/tour-brands/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const brand = await storage.getTourBrandById(id);
      if (!brand) {
        return res.status(404).json({ message: "برند تور یافت نشد" });
      }
      res.json(brand);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/tour-brands", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertTourBrandSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات برند تور معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const brand = await storage.createTourBrand(validation.data);
      
      // Log creation
      await storage.createSystemLog({
        level: 'info',
        message: `برند تور جدید ایجاد شد: ${brand.name}`,
        module: 'tour-management',
        details: { brandId: brand.id, type: brand.type }
      });
      
      res.status(201).json(brand);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/tour-brands/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the update data
      const updateSchema = z.object({
        name: z.string().optional(),
        type: z.string().optional(),
        telegramChannel: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        active: z.boolean().optional()
      });
      
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات بروزرسانی معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const brand = await storage.updateTourBrand(id, validation.data);
      if (!brand) {
        return res.status(404).json({ message: "برند تور یافت نشد" });
      }
      
      // Log update
      await storage.createSystemLog({
        level: 'info',
        message: `برند تور بروزرسانی شد: ${brand.name}`,
        module: 'tour-management',
        details: { 
          brandId: brand.id,
          changes: validation.data
        }
      });
      
      res.json(brand);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/tour-brands/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get the brand to log its name
      const brand = await storage.getTourBrandById(id);
      if (!brand) {
        return res.status(404).json({ message: "برند تور یافت نشد" });
      }
      
      const success = await storage.deleteTourBrand(id);
      if (!success) {
        return res.status(404).json({ message: "برند تور یافت نشد" });
      }
      
      // Log deletion
      await storage.createSystemLog({
        level: 'warning',
        message: `برند تور حذف شد: ${brand.name}`,
        module: 'tour-management',
        details: { brandId: id }
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // Tour Brand Requests routes
  app.get("/api/tour-brand-requests", isAuthenticated, async (req, res, next) => {
    try {
      const brandRequests = await storage.getTourBrandRequests();
      res.json(brandRequests);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/tour-brand-requests/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const brandRequest = await storage.getTourBrandRequestById(id);
      if (!brandRequest) {
        return res.status(404).json({ message: "درخواست برند تور یافت نشد" });
      }
      res.json(brandRequest);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/tour-brand-requests", async (req, res, next) => {
    try {
      const validation = insertTourBrandRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات درخواست برند تور معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const brandRequest = await storage.createTourBrandRequest(validation.data);
      
      // Log creation
      await storage.createSystemLog({
        level: 'info',
        message: `درخواست برند تور جدید ثبت شد: ${brandRequest.name}`,
        module: 'tour-management',
        details: { requestId: brandRequest.id, type: brandRequest.type }
      });
      
      res.status(201).json(brandRequest);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/tour-brand-requests/:id/status", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the status update
      const statusSchema = z.object({
        status: z.enum(["pending", "approved", "rejected"])
      });
      
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "وضعیت درخواست معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const brandRequest = await storage.updateTourBrandRequestStatus(id, validation.data.status);
      if (!brandRequest) {
        return res.status(404).json({ message: "درخواست برند تور یافت نشد" });
      }
      
      // اگر درخواست تأیید شده، برند تور جدید ایجاد کنیم
      if (validation.data.status === "approved") {
        try {
          const newBrand = await storage.createTourBrand({
            name: brandRequest.name,
            type: brandRequest.type,
            telegramChannel: brandRequest.telegramChannel,
            description: brandRequest.description,
            active: true
          });
          
          // Log the brand creation
          await storage.createSystemLog({
            level: 'info',
            message: `برند تور جدید از درخواست تأیید شده ایجاد شد: ${newBrand.name}`,
            module: 'tour-management',
            details: { 
              brandId: newBrand.id, 
              requestId: brandRequest.id 
            }
          });
        } catch (createError) {
          console.error('خطا در ایجاد برند تور از درخواست تأیید شده:', createError);
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ایجاد برند تور از درخواست تأیید شده: ${brandRequest.name}`,
            module: 'tour-management',
            details: { 
              error: createError instanceof Error ? createError.message : 'خطای ناشناخته',
              requestId: brandRequest.id 
            }
          });
        }
      }
      
      // Log status update
      await storage.createSystemLog({
        level: 'info',
        message: `وضعیت درخواست برند تور به "${validation.data.status}" تغییر یافت: ${brandRequest.name}`,
        module: 'tour-management',
        details: { requestId: brandRequest.id }
      });
      
      res.json(brandRequest);
    } catch (error) {
      next(error);
    }
  });
  
  // Tour Settings routes
  app.get("/api/tour-settings", isAuthenticated, async (req, res, next) => {
    try {
      const settings = await storage.getTourSettings();
      if (!settings) {
        return res.status(404).json({ message: "تنظیمات تور یافت نشد" });
      }
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/tour-settings/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the update data
      const updateSchema = z.object({
        avalaiApiKey: z.string().optional(),
        telegramToken: z.string().optional(),
        telegramChannels: z.string().optional(),
        timezone: z.string().optional(),
        intervalHours: z.number().optional()
      });
      
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات بروزرسانی معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const settings = await storage.updateTourSettings(id, validation.data);
      if (!settings) {
        return res.status(404).json({ message: "تنظیمات تور یافت نشد" });
      }
      
      // Log update
      await storage.createSystemLog({
        level: 'info',
        message: `تنظیمات تور بروزرسانی شد`,
        module: 'tour-management',
        details: { 
          settingsId: settings.id,
          changes: Object.keys(validation.data)
        }
      });
      
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  // Tour History routes
  app.get("/api/tour-history", isAuthenticated, async (req, res, next) => {
    try {
      const history = await storage.getTourHistory();
      res.json(history);
    } catch (error) {
      next(error);
    }
  });
  
  // Tour Logs routes
  app.get("/api/tour-logs", isAuthenticated, async (req, res, next) => {
    try {
      const logs = await storage.getTourLogs();
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/tour-logs", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertTourLogSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات لاگ تور معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const log = await storage.createTourLog(validation.data);
      res.status(201).json(log);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/tour-logs/clear", isAuthenticated, async (req, res, next) => {
    try {
      const success = await storage.clearTourLogs();
      if (success) {
        await storage.createSystemLog({
          level: 'warning',
          message: `تمام لاگ‌های تور پاک شدند`,
          module: 'tour-management'
        });
        res.status(200).json({ message: "لاگ‌های تور با موفقیت پاک شدند" });
      } else {
        res.status(500).json({ message: "خطا در پاک کردن لاگ‌های تور" });
      }
    } catch (error) {
      next(error);
    }
  });

  // API for tour data (اطلاعات تورها)
  app.get("/api/tour-sources", isAuthenticated, async (req, res, next) => {
    try {
      const sources = await storage.getTourSources();
      res.json(sources);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tour-sources/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const source = await storage.getTourSourceById(id);
      if (!source) {
        return res.status(404).json({ message: "منبع تور یافت نشد" });
      }
      res.json(source);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tour-sources", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertTourSourceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات منبع تور معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const source = await storage.createTourSource(validation.data);
      
      // ثبت لاگ سیستم
      await storage.createTourLog({
        level: "INFO",
        message: `منبع تور جدید "${source.name}" اضافه شد`,
        content: source.url
      });
      
      res.status(201).json(source);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/tour-sources/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertTourSourceSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات منبع تور معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const source = await storage.updateTourSource(id, validation.data);
      if (!source) {
        return res.status(404).json({ message: "منبع تور یافت نشد" });
      }
      
      // ثبت لاگ سیستم
      await storage.createTourLog({
        level: "INFO",
        message: `منبع تور "${source.name}" بروزرسانی شد`,
        content: JSON.stringify(validation.data)
      });
      
      res.json(source);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tour-sources/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      // ابتدا اطلاعات منبع را قبل از حذف دریافت می‌کنیم
      const source = await storage.getTourSourceById(id);
      if (!source) {
        return res.status(404).json({ message: "منبع تور یافت نشد" });
      }
      
      // حذف داده‌های مرتبط با این منبع
      await storage.deleteTourDataBySourceId(id);
      
      // حذف منبع
      const success = await storage.deleteTourSource(id);
      if (!success) {
        return res.status(500).json({ message: "حذف منبع تور با خطا مواجه شد" });
      }
      
      // ثبت لاگ سیستم
      await storage.createTourLog({
        level: "INFO",
        message: `منبع تور "${source.name}" حذف شد`,
        content: source.url
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // API اسکرپ کردن منبع تور
  app.post("/api/tour-sources/:id/scrape", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const source = await storage.getTourSourceById(id);
      
      if (!source) {
        return res.status(404).json({ message: "منبع تور یافت نشد" });
      }
      
      // اسکرپ کردن منبع تور با استفاده از سرویس اسکرپینگ
      const success = await scrapeTourSource(source);
      
      if (success) {
        // ثبت لاگ موفقیت
        await storage.createTourLog({
          level: "INFO",
          message: `اسکرپ منبع "${source.name}" با موفقیت انجام شد`,
          content: source.url
        });
        
        res.json({ 
          success: true, 
          message: "اسکرپ با موفقیت انجام شد" 
        });
      } else {
        // ثبت لاگ خطا
        await storage.createTourLog({
          level: "ERROR",
          message: `خطا در اسکرپ منبع "${source.name}"`,
          content: source.url
        });
        
        res.status(500).json({ 
          success: false, 
          message: "خطا در اسکرپ منبع تور" 
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // مسیر برای استخراج مستقیم اطلاعات تور از skyrotrip
  app.post("/api/tour-data/skyro-scrape", isAuthenticated, async (req, res, next) => {
    try {
      const schema = z.object({
        url: z.string().url(),
        sourceId: z.number(),
        destinationId: z.number().optional(),
        brandId: z.number().optional()
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "اطلاعات ورودی نامعتبر است",
          errors: validation.error.errors
        });
      }
      
      const { url, sourceId, destinationId, brandId } = validation.data;
      
      // اسکرپ اطلاعات و ایجاد تور جدید
      const result = await SkyroScraper.createTourFromSkyroTrip(url, sourceId, destinationId, brandId);
      
      if (result.success) {
        res.json({
          success: true,
          message: "تور با موفقیت از skyrotrip.com استخراج و ذخیره شد",
          tourId: result.tourId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in skyro scraping:', error);
      
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: "ERROR",
        message: "خطا در اسکرپ تور از سایت skyrotrip",
        content: error instanceof Error ? error.message : 'خطای ناشناخته'
      });
      
      next(error);
    }
  });
  
  // مسیر برای بروزرسانی اطلاعات تور موجود از skyrotrip
  app.post("/api/tour-data/:id/skyro-update", isAuthenticated, async (req, res, next) => {
    try {
      const tourId = parseInt(req.params.id);
      const schema = z.object({
        url: z.string().url()
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "آدرس ورودی نامعتبر است",
          errors: validation.error.errors
        });
      }
      
      const { url } = validation.data;
      
      // بروزرسانی اطلاعات تور
      const result = await SkyroScraper.updateTourData(tourId, url);
      
      if (result.success) {
        res.json({
          success: true,
          message: "اطلاعات تور با موفقیت از skyrotrip.com بروزرسانی شد"
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in updating tour from skyro:', error);
      
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: "ERROR",
        message: "خطا در بروزرسانی اطلاعات تور از سایت skyrotrip",
        content: error instanceof Error ? error.message : 'خطای ناشناخته'
      });
      
      next(error);
    }
  });

  app.get("/api/tour-data", isAuthenticated, async (req, res, next) => {
    try {
      const { sourceId } = req.query;
      let tourData;
      
      if (sourceId && typeof sourceId === 'string') {
        tourData = await storage.getTourDataBySourceId(parseInt(sourceId));
      } else {
        tourData = await storage.getTourData();
      }
      
      res.json(tourData);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tour-data/generate-message", isAuthenticated, async (req, res, next) => {
    try {
      const messageSchema = z.object({
        tourId: z.number(),
      });
      
      const validation = messageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "اطلاعات درخواست معتبر نیست", 
          errors: validation.error.errors 
        });
      }
      
      const { tourId } = validation.data;
      const tourData = await storage.getTourDataById(tourId);
      
      if (!tourData) {
        return res.status(404).json({ message: "اطلاعات تور یافت نشد" });
      }
      
      // گرفتن اطلاعات metadata برای استخراج خدمات، هتل‌ها و غیره
      const metadata = tourData.metadata as any;
      const extendedTourData = {
        ...tourData,
        metadata: tourData.metadata as Record<string, any> | null,
        services: tourData.services || [],
        hotels: tourData.hotels || [],
        requiredDocuments: tourData.requiredDocuments || [],
        cancellationPolicy: tourData.cancellationPolicy || null,
      };
      
      // تولید پیام تلگرام با استفاده از تابع
      const telegramMessage = generateTelegramMessage(extendedTourData as any);
      
      res.json({ message: telegramMessage });
    } catch (error) {
      next(error);
    }
  });
  
  // API برای ارسال تور به تلگرام
  app.post("/api/tour-data/:id/send-telegram", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // دریافت اطلاعات تور
      const tourData = await storage.getTourDataById(id);
      
      if (!tourData) {
        return res.status(404).json({ message: "اطلاعات تور یافت نشد" });
      }
      
      // دریافت تنظیمات تور
      const tourSettings = await storage.getTourSettings();
      if (!tourSettings) {
        return res.status(400).json({ 
          message: "تنظیمات تور یافت نشد" 
        });
      }
      
      // گرفتن اطلاعات metadata برای استخراج خدمات، هتل‌ها و غیره
      const extendedTourData = {
        ...tourData,
        metadata: tourData.metadata as Record<string, any> | null,
        services: tourData.services || [],
        hotels: tourData.hotels || [],
        requiredDocuments: tourData.requiredDocuments || [],
        cancellationPolicy: tourData.cancellationPolicy || null,
      };
      
      // تولید پیام تلگرام با استفاده از تابع
      const telegramMessage = generateTelegramMessage(extendedTourData as any);
      
      // ارسال پیام به تلگرام با استفاده از متد مخصوص ارسال تور
      const result = await TelegramService.sendTourMessage(
        telegramMessage,
        tourData.title
      );
      
      if (result.status) {
        // ثبت لاگ
        await storage.createTourLog({
          level: "INFO",
          message: `اطلاعات تور "${tourData.title}" به کانال تلگرام ارسال شد`,
          content: telegramMessage.substring(0, 200) + "..."
        });
        
        res.json({ 
          success: true, 
          message: "اطلاعات تور با موفقیت به کانال تلگرام ارسال شد"
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: "ERROR",
        message: `خطا در ارسال اطلاعات تور به تلگرام`,
        content: error.message
      });
      
      res.status(500).json({ 
        success: false, 
        message: error.message || "خطا در ارسال به تلگرام" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
