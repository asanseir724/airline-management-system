import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { SmsService } from "./services/sms";
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
      
      // If there's a telegram config, simulate sending to telegram
      const telegramConfig = await storage.getTelegramConfig();
      if (telegramConfig) {
        await storage.createTelegramHistory({
          requestId: request.id,
          customerName: request.customerName,
          requestType: request.requestType,
          status: "sent"
        });
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
  
  // Customer Request routes
  app.post("/api/customer-requests", async (req, res, next) => {
    try {
      const validation = insertCustomerRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "اطلاعات درخواست معتبر نیست", errors: validation.error.errors });
      }
      
      const request = await storage.createCustomerRequest(validation.data);
      
      // If there's a telegram config, simulate sending to telegram
      const telegramConfig = await storage.getTelegramConfig();
      if (telegramConfig && telegramConfig.isActive) {
        await storage.createTelegramHistory({
          requestId: request.id,
          customerName: request.accountOwner, // Using account owner name as customer name
          requestType: "refund",
          status: "sent"
        });
      }
      
      // ارسال پیامک تاییدیه
      const smsTemplates = await storage.getSmsTemplates();
      const pendingTemplate = smsTemplates.find(t => t.name === "در حال بررسی");
      if (pendingTemplate) {
        try {
          // ارسال پیامک از طریق سرویس AmootSMS
          await SmsService.sendSms(request.phoneNumber, pendingTemplate.content, request.id);
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
