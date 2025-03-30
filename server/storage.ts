import {
  users, type User, type InsertUser, 
  requests, type Request, type InsertRequest,
  smsTemplates, type SmsTemplate, type InsertSmsTemplate,
  smsHistory, type SmsHistory, type InsertSmsHistory,
  smsSettings, type SmsSettings, type InsertSmsSettings,
  telegramConfig, type TelegramConfig, type InsertTelegramConfig,
  telegramHistory, type TelegramHistory, type InsertTelegramHistory,
  backupHistory, type BackupHistory, type InsertBackupHistory,
  backupSettings, type BackupSettings, type InsertBackupSettings,
  customerRequests, type CustomerRequest, type InsertCustomerRequest,
  systemLogs, type SystemLog, type InsertSystemLog
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import connectPg from "connect-pg-simple";
import dotenv from 'dotenv';
import * as schema from '@shared/schema';
import { eq, desc } from "drizzle-orm";

dotenv.config();

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Request methods
  getRequests(): Promise<Request[]>;
  getRequestById(id: number): Promise<Request | undefined>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<Request | undefined>;
  
  // Customer Request methods
  getCustomerRequests(): Promise<CustomerRequest[]>;
  getCustomerRequestById(id: number): Promise<CustomerRequest | undefined>;
  createCustomerRequest(request: InsertCustomerRequest): Promise<CustomerRequest>;
  updateCustomerRequestStatus(id: number, status: string): Promise<CustomerRequest | undefined>;
  
  // SMS Template methods
  getSmsTemplates(): Promise<SmsTemplate[]>;
  getSmsTemplateById(id: number): Promise<SmsTemplate | undefined>;
  createSmsTemplate(template: InsertSmsTemplate): Promise<SmsTemplate>;
  updateSmsTemplate(id: number, template: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined>;
  deleteSmsTemplate(id: number): Promise<boolean>;
  
  // SMS History methods
  getSmsHistory(): Promise<SmsHistory[]>;
  createSmsHistory(history: InsertSmsHistory): Promise<SmsHistory>;
  
  // SMS Settings methods
  getSmsSettings(): Promise<SmsSettings | undefined>;
  createSmsSettings(settings: InsertSmsSettings): Promise<SmsSettings>;
  updateSmsSettings(id: number, settings: Partial<InsertSmsSettings>): Promise<SmsSettings | undefined>;
  
  // Telegram Config methods
  getTelegramConfig(): Promise<TelegramConfig | undefined>;
  createTelegramConfig(config: InsertTelegramConfig): Promise<TelegramConfig>;
  updateTelegramConfig(id: number, config: Partial<InsertTelegramConfig>): Promise<TelegramConfig | undefined>;
  
  // Telegram History methods
  getTelegramHistory(): Promise<TelegramHistory[]>;
  createTelegramHistory(history: InsertTelegramHistory): Promise<TelegramHistory>;
  
  // Backup History methods
  getBackupHistory(): Promise<BackupHistory[]>;
  createBackupHistory(history: InsertBackupHistory): Promise<BackupHistory>;
  deleteBackupHistory(id: number): Promise<boolean>;
  
  // Backup Settings methods
  getBackupSettings(): Promise<BackupSettings | undefined>;
  createBackupSettings(settings: InsertBackupSettings): Promise<BackupSettings>;
  updateBackupSettings(id: number, settings: Partial<InsertBackupSettings>): Promise<BackupSettings | undefined>;
  
  // System Logs methods
  getSystemLogs(): Promise<SystemLog[]>;
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  deleteSystemLog(id: number): Promise<boolean>;
  clearSystemLogs(): Promise<boolean>;
  
  // Session store
  sessionStore: SessionStore;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  readonly sessionStore: Express.SessionStore;
  
  constructor() {
    // Setup PostgreSQL connection
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema });
    
    // Setup session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString,
      },
      createTableIfMissing: true,
    });
    
    // Init database
    this.init();
  }
  
  private async init() {
    try {
      // Check if we need to add default data
      const smsTemplates = await this.getSmsTemplates();
      if (smsTemplates.length === 0) {
        // Add default SMS templates
        await this.createSmsTemplate({
          name: "تایید درخواست",
          content: "✅ مشتری گرامی، درخواست شما تایید شد. با تشکر از اعتماد شما - شرکت هواپیمایی"
        });
        await this.createSmsTemplate({
          name: "رد درخواست",
          content: "❌ مشتری گرامی، متاسفانه درخواست شما رد شد. لطفا برای اطلاعات بیشتر با پشتیبانی تماس بگیرید - شرکت هواپیمایی"
        });
        await this.createSmsTemplate({
          name: "در حال بررسی",
          content: "✨ مشتری گرامی، درخواست شما با موفقیت ثبت شد و در حال بررسی است. با تشکر - شرکت هواپیمایی"
        });
      }
      
      // Add default backup settings if needed
      const backupSettings = await this.getBackupSettings();
      if (!backupSettings) {
        await this.createBackupSettings({
          frequency: "daily",
          time: "00:00",
          autoDelete: false,
          isActive: true
        });
      }
      
      // Add default telegram config if needed
      const telegramConfig = await this.getTelegramConfig();
      if (!telegramConfig) {
        await this.createTelegramConfig({
          botToken: "",
          channelId: "@airlinerequeststest",
          messageFormat: `✈️ درخواست جدید

👤 نام مشتری: {customer_name}
📱 شماره تماس: {phone_number}
🎫 شماره بلیط: {ticket_number}
📝 نوع درخواست: {request_type}

توضیحات: {description}`,
          isActive: true
        });
      }
      
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(schema.users).values({
      username: insertUser.username,
      password: insertUser.password,
      displayName: insertUser.displayName || null,
      isAdmin: insertUser.isAdmin || false
    }).returning();
    
    return result[0];
  }
  
  // Request methods
  async getRequests(): Promise<Request[]> {
    return await this.db.select().from(schema.requests).orderBy(desc(schema.requests.createdAt));
  }
  
  async getRequestById(id: number): Promise<Request | undefined> {
    const result = await this.db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1);
    return result[0];
  }
  
  async createRequest(insertRequest: InsertRequest): Promise<Request> {
    const result = await this.db.insert(schema.requests).values({
      customerName: insertRequest.customerName,
      phoneNumber: insertRequest.phoneNumber,
      ticketNumber: insertRequest.ticketNumber,
      requestType: insertRequest.requestType,
      description: insertRequest.description || null
    }).returning();
    
    return result[0];
  }
  
  async updateRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<Request | undefined> {
    const result = await this.db.update(schema.requests)
      .set({ 
        status: status,
        updatedAt: new Date()
      })
      .where(eq(schema.requests.id, id))
      .returning();
    
    return result[0];
  }
  
  // Customer Request methods
  async getCustomerRequests(): Promise<CustomerRequest[]> {
    return await this.db.select().from(schema.customerRequests).orderBy(desc(schema.customerRequests.createdAt));
  }
  
  async getCustomerRequestById(id: number): Promise<CustomerRequest | undefined> {
    const result = await this.db.select().from(schema.customerRequests).where(eq(schema.customerRequests.id, id)).limit(1);
    return result[0];
  }
  
  async createCustomerRequest(insertRequest: InsertCustomerRequest): Promise<CustomerRequest> {
    const result = await this.db.insert(schema.customerRequests).values({
      email: insertRequest.email || null,
      website: insertRequest.website,
      refundReason: insertRequest.refundReason,
      voucherNumber: insertRequest.voucherNumber,
      phoneNumber: insertRequest.phoneNumber,
      ibanNumber: insertRequest.ibanNumber,
      accountOwner: insertRequest.accountOwner,
      description: insertRequest.description || null,
      contactedSupport: insertRequest.contactedSupport || false,
      acceptTerms: insertRequest.acceptTerms || false
    }).returning();
    
    return result[0];
  }
  
  async updateCustomerRequestStatus(id: number, status: string): Promise<CustomerRequest | undefined> {
    const result = await this.db.update(schema.customerRequests)
      .set({ status })
      .where(eq(schema.customerRequests.id, id))
      .returning();
    
    return result[0];
  }
  
  // SMS Template methods
  async getSmsTemplates(): Promise<SmsTemplate[]> {
    return await this.db.select().from(schema.smsTemplates);
  }
  
  async getSmsTemplateById(id: number): Promise<SmsTemplate | undefined> {
    const result = await this.db.select().from(schema.smsTemplates).where(eq(schema.smsTemplates.id, id)).limit(1);
    return result[0];
  }
  
  async createSmsTemplate(insertTemplate: InsertSmsTemplate): Promise<SmsTemplate> {
    const result = await this.db.insert(schema.smsTemplates).values({
      name: insertTemplate.name,
      content: insertTemplate.content
    }).returning();
    
    return result[0];
  }
  
  async updateSmsTemplate(id: number, template: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined> {
    const result = await this.db.update(schema.smsTemplates)
      .set(template)
      .where(eq(schema.smsTemplates.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteSmsTemplate(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.smsTemplates)
      .where(eq(schema.smsTemplates.id, id));
    
    return !!result;
  }
  
  // SMS History methods
  async getSmsHistory(): Promise<SmsHistory[]> {
    return await this.db.select().from(schema.smsHistory).orderBy(desc(schema.smsHistory.createdAt));
  }
  
  async createSmsHistory(insertHistory: InsertSmsHistory): Promise<SmsHistory> {
    const result = await this.db.insert(schema.smsHistory).values({
      requestId: insertHistory.requestId || null,
      phoneNumber: insertHistory.phoneNumber,
      content: insertHistory.content,
      status: insertHistory.status
    }).returning();
    
    return result[0];
  }
  
  // Telegram Config methods
  async getTelegramConfig(): Promise<TelegramConfig | undefined> {
    const result = await this.db.select().from(schema.telegramConfig).limit(1);
    return result[0];
  }
  
  async createTelegramConfig(insertConfig: InsertTelegramConfig): Promise<TelegramConfig> {
    const result = await this.db.insert(schema.telegramConfig).values({
      botToken: insertConfig.botToken,
      channelId: insertConfig.channelId,
      messageFormat: insertConfig.messageFormat,
      isActive: insertConfig.isActive !== undefined ? insertConfig.isActive : true
    }).returning();
    
    return result[0];
  }
  
  async updateTelegramConfig(id: number, config: Partial<InsertTelegramConfig>): Promise<TelegramConfig | undefined> {
    const updateData: any = { ...config };
    if (Object.keys(config).length > 0) {
      updateData.updatedAt = new Date();
    }
    
    const result = await this.db.update(schema.telegramConfig)
      .set(updateData)
      .where(eq(schema.telegramConfig.id, id))
      .returning();
    
    return result[0];
  }
  
  // Telegram History methods
  async getTelegramHistory(): Promise<TelegramHistory[]> {
    return await this.db.select().from(schema.telegramHistory).orderBy(desc(schema.telegramHistory.createdAt));
  }
  
  async createTelegramHistory(insertHistory: InsertTelegramHistory): Promise<TelegramHistory> {
    const result = await this.db.insert(schema.telegramHistory).values({
      requestId: insertHistory.requestId || null,
      customerName: insertHistory.customerName,
      requestType: insertHistory.requestType,
      status: insertHistory.status
    }).returning();
    
    return result[0];
  }
  
  // Backup History methods
  async getBackupHistory(): Promise<BackupHistory[]> {
    return await this.db.select().from(schema.backupHistory).orderBy(desc(schema.backupHistory.createdAt));
  }
  
  async createBackupHistory(insertHistory: InsertBackupHistory): Promise<BackupHistory> {
    const result = await this.db.insert(schema.backupHistory).values({
      filename: insertHistory.filename,
      size: insertHistory.size,
      type: insertHistory.type
    }).returning();
    
    return result[0];
  }
  
  async deleteBackupHistory(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.backupHistory)
      .where(eq(schema.backupHistory.id, id));
    
    return !!result;
  }
  
  // Backup Settings methods
  async getBackupSettings(): Promise<BackupSettings | undefined> {
    const result = await this.db.select().from(schema.backupSettings).limit(1);
    return result[0];
  }
  
  async createBackupSettings(insertSettings: InsertBackupSettings): Promise<BackupSettings> {
    const result = await this.db.insert(schema.backupSettings).values({
      frequency: insertSettings.frequency,
      time: insertSettings.time,
      autoDelete: insertSettings.autoDelete !== undefined ? insertSettings.autoDelete : false,
      isActive: insertSettings.isActive !== undefined ? insertSettings.isActive : true
    }).returning();
    
    return result[0];
  }
  
  async updateBackupSettings(id: number, settings: Partial<InsertBackupSettings>): Promise<BackupSettings | undefined> {
    const updateData: any = { ...settings };
    if (Object.keys(settings).length > 0) {
      updateData.updatedAt = new Date();
    }
    
    const result = await this.db.update(schema.backupSettings)
      .set(updateData)
      .where(eq(schema.backupSettings.id, id))
      .returning();
    
    return result[0];
  }
  
  // SMS Settings methods
  async getSmsSettings(): Promise<SmsSettings | undefined> {
    const result = await this.db.select().from(schema.smsSettings).limit(1);
    return result[0];
  }
  
  async createSmsSettings(insertSettings: InsertSmsSettings): Promise<SmsSettings> {
    const result = await this.db.insert(schema.smsSettings).values({
      token: insertSettings.token,
      defaultLine: insertSettings.defaultLine || "980000000",
      backupLine: insertSettings.backupLine || "980000000",
      username: insertSettings.username || "",
      password: insertSettings.password || "",
      enabled: insertSettings.enabled !== undefined ? insertSettings.enabled : true
    }).returning();
    
    return result[0];
  }
  
  async updateSmsSettings(id: number, settings: Partial<InsertSmsSettings>): Promise<SmsSettings | undefined> {
    const updateData: any = { ...settings };
    if (Object.keys(settings).length > 0) {
      updateData.updatedAt = new Date();
    }
    
    const result = await this.db.update(schema.smsSettings)
      .set(updateData)
      .where(eq(schema.smsSettings.id, id))
      .returning();
    
    return result[0];
  }
  
  // System Logs methods
  async getSystemLogs(): Promise<SystemLog[]> {
    return await this.db.select().from(schema.systemLogs).orderBy(desc(schema.systemLogs.createdAt));
  }
  
  async createSystemLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const result = await this.db.insert(schema.systemLogs).values({
      level: insertLog.level,
      message: insertLog.message,
      module: insertLog.module || null,
      details: insertLog.details || null
    }).returning();
    
    return result[0];
  }
  
  async deleteSystemLog(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.systemLogs)
      .where(eq(schema.systemLogs.id, id));
    
    return !!result;
  }
  
  async clearSystemLogs(): Promise<boolean> {
    try {
      await this.db.delete(schema.systemLogs);
      return true;
    } catch (error) {
      console.error("Error clearing system logs:", error);
      return false;
    }
  }
}

// For session store type compatibility
type SessionStore = any; // Use any type to bypass the type checking issues

export const storage = new DatabaseStorage();
