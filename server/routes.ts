import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { SmsService } from "./services/sms";
import { TelegramService } from "./services/telegram";
import { ReportService } from "./services/report";
import { 
  insertRequestSchema, 
  insertSmsTemplateSchema, 
  insertSmsHistorySchema,
  insertTelegramConfigSchema,
  insertBackupSettingsSchema,
  insertCustomerRequestSchema,
  insertSystemLogSchema,
  insertSmsSettingsSchema
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
  
  // API routes
  // Requests routes
  app.get("/api/requests", isAuthenticated, async (req, res, next) => {
    try {
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
      // In a real app, we would trigger actual backup here
      // For now, just create a record
      const backup = await storage.createBackupHistory({
        filename: `backup_${new Date().toISOString().replace(/[:.]/g, "")}.sql`,
        size: "125 مگابایت",
        type: "manual"
      });
      
      res.status(201).json(backup);
    } catch (error) {
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
  
  app.get("/api/customer-requests", isAuthenticated, async (req, res, next) => {
    try {
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
  
  app.get("/api/customer-requests/:id", isAuthenticated, async (req, res, next) => {
    try {
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
  
  app.patch("/api/customer-requests/:id/status", isAuthenticated, async (req, res, next) => {
    try {
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

  const httpServer = createServer(app);

  return httpServer;
}
