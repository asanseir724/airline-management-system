import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertRequestSchema, 
  insertSmsTemplateSchema, 
  insertSmsHistorySchema,
  insertTelegramConfigSchema,
  insertBackupSettingsSchema
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
      const statusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });
      
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid status", errors: validation.error.errors });
      }
      
      const request = await storage.updateRequestStatus(id, validation.data.status);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.json(request);
    } catch (error) {
      next(error);
    }
  });
  
  // SMS Templates routes
  app.get("/api/sms-templates", isAuthenticated, async (req, res, next) => {
    try {
      const templates = await storage.getSmsTemplates();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/sms-templates", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertSmsTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error.errors });
      }
      
      const template = await storage.createSmsTemplate(validation.data);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/sms-templates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateSmsTemplate(id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/sms-templates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSmsTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // SMS History routes
  app.get("/api/sms-history", isAuthenticated, async (req, res, next) => {
    try {
      const history = await storage.getSmsHistory();
      res.json(history);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/send-sms", isAuthenticated, async (req, res, next) => {
    try {
      const validation = insertSmsHistorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid SMS data", errors: validation.error.errors });
      }
      
      // In a real app, we would call SMS API here
      // For now, just record the attempt
      const smsRecord = await storage.createSmsHistory(validation.data);
      res.status(201).json(smsRecord);
    } catch (error) {
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

  const httpServer = createServer(app);

  return httpServer;
}
