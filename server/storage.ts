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
  systemLogs, type SystemLog, type InsertSystemLog,
  // Tour related imports
  tourDestinations, type TourDestination, type InsertTourDestination,
  tourBrands, type TourBrand, type InsertTourBrand,
  tourBrandRequests, type TourBrandRequest, type InsertTourBrandRequest,
  tourSettings, type TourSetting, type InsertTourSetting,
  tourHistory, type TourHistory, type InsertTourHistory,
  tourLogs, type TourLog, type InsertTourLog,
  // Tour scraping related imports
  tourSources, type TourSource, type InsertTourSource,
  tourData, type TourData, type InsertTourData
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
  getCustomerRequestByVoucherNumber(voucherNumber: string): Promise<CustomerRequest | undefined>;
  createCustomerRequest(request: InsertCustomerRequest & { trackingCode: string }): Promise<CustomerRequest>;
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
  
  // Tour Destination methods
  getTourDestinations(): Promise<TourDestination[]>;
  getTourDestinationById(id: number): Promise<TourDestination | undefined>;
  createTourDestination(destination: InsertTourDestination): Promise<TourDestination>;
  updateTourDestination(id: number, destination: Partial<InsertTourDestination>): Promise<TourDestination | undefined>;
  deleteTourDestination(id: number): Promise<boolean>;
  
  // Tour Brand methods
  getTourBrands(): Promise<TourBrand[]>;
  getTourBrandById(id: number): Promise<TourBrand | undefined>;
  createTourBrand(brand: InsertTourBrand): Promise<TourBrand>;
  updateTourBrand(id: number, brand: Partial<InsertTourBrand>): Promise<TourBrand | undefined>;
  deleteTourBrand(id: number): Promise<boolean>;
  
  // Tour Brand Request methods
  getTourBrandRequests(): Promise<TourBrandRequest[]>;
  getTourBrandRequestById(id: number): Promise<TourBrandRequest | undefined>;
  createTourBrandRequest(request: InsertTourBrandRequest): Promise<TourBrandRequest>;
  updateTourBrandRequestStatus(id: number, status: string): Promise<TourBrandRequest | undefined>;
  
  // Tour Settings methods
  getTourSettings(): Promise<TourSetting | undefined>;
  createTourSettings(settings: InsertTourSetting): Promise<TourSetting>;
  updateTourSettings(id: number, settings: Partial<InsertTourSetting>): Promise<TourSetting | undefined>;
  
  // Tour History methods
  getTourHistory(): Promise<TourHistory[]>;
  createTourHistory(history: InsertTourHistory): Promise<TourHistory>;
  
  // Tour Log methods
  getTourLogs(): Promise<TourLog[]>;
  createTourLog(log: InsertTourLog): Promise<TourLog>;
  clearTourLogs(): Promise<boolean>;
  
  // Tour Source methods
  getTourSources(): Promise<TourSource[]>;
  getTourSourceById(id: number): Promise<TourSource | undefined>;
  createTourSource(source: InsertTourSource): Promise<TourSource>;
  updateTourSource(id: number, source: Partial<InsertTourSource>): Promise<TourSource | undefined>;
  deleteTourSource(id: number): Promise<boolean>;
  updateTourSourceLastScraped(id: number, lastScraped: Date): Promise<TourSource | undefined>;
  
  // Tour Data methods
  getTourData(): Promise<TourData[]>;
  getTourDataById(id: number): Promise<TourData | undefined>;
  getTourDataBySourceId(sourceId: number): Promise<TourData[]>;
  createTourData(data: InsertTourData): Promise<TourData>;
  updateTourData(id: number, data: Partial<InsertTourData>): Promise<TourData | undefined>;
  deleteTourData(id: number): Promise<boolean>;
  deleteTourDataBySourceId(sourceId: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  readonly sessionStore: any;
  
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
      
      // Add default tour settings if needed
      const tourSettings = await this.getTourSettings();
      if (!tourSettings) {
        await this.createTourSettings({
          avalaiApiKey: "aa-Sqsb4xUwWTDcjijQbiA9lcinKmBv8JfLevU86YtfuFPM6bZ9",
          telegramToken: "",
          telegramChannels: "@skyro_travel",
          timezone: "Asia/Tehran",
          intervalHours: 24
        });
      }
      
      // Add default tour destinations if needed
      const tourDestinations = await this.getTourDestinations();
      if (tourDestinations.length === 0) {
        const defaultDestinations = [
          "مشهد", "کیش", "استانبول", "دبی", "آنتالیا", "پاتایا", "پوکت", "باکو", "تفلیس", "کوالالامپور"
        ];
        
        for (const name of defaultDestinations) {
          await this.createTourDestination({ name, active: true });
        }
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
  
  async getCustomerRequestByVoucherNumber(voucherNumber: string): Promise<CustomerRequest | undefined> {
    const result = await this.db.select().from(schema.customerRequests)
      .where(eq(schema.customerRequests.voucherNumber, voucherNumber))
      .limit(1);
    return result[0];
  }
  
  async createCustomerRequest(insertRequest: InsertCustomerRequest & { trackingCode: string }): Promise<CustomerRequest> {
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
      acceptTerms: insertRequest.acceptTerms || false,
      trackingCode: insertRequest.trackingCode
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

  // Tour Destination methods
  async getTourDestinations(): Promise<TourDestination[]> {
    return await this.db.select().from(schema.tourDestinations);
  }
  
  async getTourDestinationById(id: number): Promise<TourDestination | undefined> {
    const result = await this.db.select().from(schema.tourDestinations).where(eq(schema.tourDestinations.id, id)).limit(1);
    return result[0];
  }
  
  async createTourDestination(destination: InsertTourDestination): Promise<TourDestination> {
    const result = await this.db.insert(schema.tourDestinations).values({
      name: destination.name,
      active: destination.active !== undefined ? destination.active : true
    }).returning();
    
    return result[0];
  }
  
  async updateTourDestination(id: number, destination: Partial<InsertTourDestination>): Promise<TourDestination | undefined> {
    const result = await this.db.update(schema.tourDestinations)
      .set(destination)
      .where(eq(schema.tourDestinations.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteTourDestination(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.tourDestinations)
      .where(eq(schema.tourDestinations.id, id));
    
    return !!result;
  }
  
  // Tour Brand methods
  async getTourBrands(): Promise<TourBrand[]> {
    return await this.db.select().from(schema.tourBrands);
  }
  
  async getTourBrandById(id: number): Promise<TourBrand | undefined> {
    const result = await this.db.select().from(schema.tourBrands).where(eq(schema.tourBrands.id, id)).limit(1);
    return result[0];
  }
  
  async createTourBrand(brand: InsertTourBrand): Promise<TourBrand> {
    const result = await this.db.insert(schema.tourBrands).values({
      name: brand.name,
      type: brand.type,
      telegramChannel: brand.telegramChannel || null,
      description: brand.description || null,
      active: brand.active !== undefined ? brand.active : true
    }).returning();
    
    return result[0];
  }
  
  async updateTourBrand(id: number, brand: Partial<InsertTourBrand>): Promise<TourBrand | undefined> {
    const result = await this.db.update(schema.tourBrands)
      .set(brand)
      .where(eq(schema.tourBrands.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteTourBrand(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.tourBrands)
      .where(eq(schema.tourBrands.id, id));
    
    return !!result;
  }
  
  // Tour Brand Request methods
  async getTourBrandRequests(): Promise<TourBrandRequest[]> {
    return await this.db.select().from(schema.tourBrandRequests).orderBy(desc(schema.tourBrandRequests.createdAt));
  }
  
  async getTourBrandRequestById(id: number): Promise<TourBrandRequest | undefined> {
    const result = await this.db.select().from(schema.tourBrandRequests).where(eq(schema.tourBrandRequests.id, id)).limit(1);
    return result[0];
  }
  
  async createTourBrandRequest(request: InsertTourBrandRequest): Promise<TourBrandRequest> {
    const result = await this.db.insert(schema.tourBrandRequests).values({
      name: request.name,
      type: request.type,
      telegramChannel: request.telegramChannel || null,
      description: request.description || null,
      contactInfo: request.contactInfo
    }).returning();
    
    return result[0];
  }
  
  async updateTourBrandRequestStatus(id: number, status: string): Promise<TourBrandRequest | undefined> {
    const result = await this.db.update(schema.tourBrandRequests)
      .set({ status })
      .where(eq(schema.tourBrandRequests.id, id))
      .returning();
    
    return result[0];
  }
  
  // Tour Settings methods
  async getTourSettings(): Promise<TourSetting | undefined> {
    const result = await this.db.select().from(schema.tourSettings).limit(1);
    return result[0];
  }
  
  async createTourSettings(settings: InsertTourSetting): Promise<TourSetting> {
    const result = await this.db.insert(schema.tourSettings).values({
      avalaiApiKey: settings.avalaiApiKey,
      telegramToken: settings.telegramToken,
      telegramChannels: settings.telegramChannels,
      timezone: settings.timezone || "Asia/Tehran",
      intervalHours: settings.intervalHours || 24
    }).returning();
    
    return result[0];
  }
  
  async updateTourSettings(id: number, settings: Partial<InsertTourSetting>): Promise<TourSetting | undefined> {
    const updateData: any = { ...settings };
    if (Object.keys(settings).length > 0) {
      updateData.updatedAt = new Date();
    }
    
    const result = await this.db.update(schema.tourSettings)
      .set(updateData)
      .where(eq(schema.tourSettings.id, id))
      .returning();
    
    return result[0];
  }
  
  // Tour History methods
  async getTourHistory(): Promise<TourHistory[]> {
    return await this.db.select().from(schema.tourHistory).orderBy(desc(schema.tourHistory.createdAt));
  }
  
  async createTourHistory(history: InsertTourHistory): Promise<TourHistory> {
    const result = await this.db.insert(schema.tourHistory).values({
      destinationName: history.destinationName,
      content: history.content,
      status: history.status || "sent"
    }).returning();
    
    return result[0];
  }
  
  // Tour Log methods
  async getTourLogs(): Promise<TourLog[]> {
    return await this.db.select().from(schema.tourLogs).orderBy(desc(schema.tourLogs.createdAt));
  }
  
  async createTourLog(log: InsertTourLog): Promise<TourLog> {
    const result = await this.db.insert(schema.tourLogs).values({
      level: log.level,
      message: log.message,
      content: log.content || null
    }).returning();
    
    return result[0];
  }
  
  async clearTourLogs(): Promise<boolean> {
    try {
      await this.db.delete(schema.tourLogs);
      return true;
    } catch (error) {
      console.error("Error clearing tour logs:", error);
      return false;
    }
  }
  
  // Tour Source methods
  async getTourSources(): Promise<TourSource[]> {
    return await this.db.select().from(schema.tourSources).orderBy(desc(schema.tourSources.createdAt));
  }
  
  async getTourSourceById(id: number): Promise<TourSource | undefined> {
    const result = await this.db.select().from(schema.tourSources).where(eq(schema.tourSources.id, id)).limit(1);
    return result[0];
  }
  
  async createTourSource(source: InsertTourSource): Promise<TourSource> {
    const result = await this.db.insert(schema.tourSources).values({
      name: source.name,
      url: source.url,
      active: source.active !== undefined ? source.active : true,
      scrapingSelector: source.scrapingSelector || null,
      scrapingType: source.scrapingType || "default",
    }).returning();
    
    return result[0];
  }
  
  async updateTourSource(id: number, source: Partial<InsertTourSource>): Promise<TourSource | undefined> {
    const updateData: any = { ...source, updatedAt: new Date() };
    
    const result = await this.db.update(schema.tourSources)
      .set(updateData)
      .where(eq(schema.tourSources.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteTourSource(id: number): Promise<boolean> {
    // First delete all tour data related to this source
    await this.deleteTourDataBySourceId(id);
    
    // Then delete the source
    const result = await this.db.delete(schema.tourSources)
      .where(eq(schema.tourSources.id, id));
    
    return !!result;
  }
  
  async updateTourSourceLastScraped(id: number, lastScraped: Date): Promise<TourSource | undefined> {
    const result = await this.db.update(schema.tourSources)
      .set({ 
        lastScraped,
        updatedAt: new Date()
      })
      .where(eq(schema.tourSources.id, id))
      .returning();
    
    return result[0];
  }
  
  // Tour Data methods
  async getTourData(): Promise<TourData[]> {
    return await this.db.select().from(schema.tourData).orderBy(desc(schema.tourData.createdAt));
  }
  
  async getTourDataById(id: number): Promise<TourData | undefined> {
    const result = await this.db.select().from(schema.tourData)
      .where(eq(schema.tourData.id, id));
    return result[0];
  }
  
  async getTourDataBySourceId(sourceId: number): Promise<TourData[]> {
    return await this.db.select().from(schema.tourData)
      .where(eq(schema.tourData.sourceId, sourceId))
      .orderBy(desc(schema.tourData.createdAt));
  }
  
  async createTourData(data: InsertTourData): Promise<TourData> {
    const result = await this.db.insert(schema.tourData).values({
      sourceId: data.sourceId,
      title: data.title,
      description: data.description || null,
      price: data.price || null,
      duration: data.duration || null,
      imageUrl: data.imageUrl || null,
      originalUrl: data.originalUrl || null,
      destinationId: data.destinationId || null,
      brandId: data.brandId || null,
      isPublished: data.isPublished !== undefined ? data.isPublished : false,
      metadata: data.metadata || null,
    }).returning();
    
    return result[0];
  }
  
  async updateTourData(id: number, data: Partial<InsertTourData>): Promise<TourData | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    const result = await this.db.update(schema.tourData)
      .set(updateData)
      .where(eq(schema.tourData.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteTourData(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.tourData)
      .where(eq(schema.tourData.id, id));
    
    return !!result;
  }
  
  async deleteTourDataBySourceId(sourceId: number): Promise<boolean> {
    const result = await this.db.delete(schema.tourData)
      .where(eq(schema.tourData.sourceId, sourceId));
    
    return !!result;
  }
}

// For session store type compatibility
type SessionStore = any; // Use any type to bypass the type checking issues

export const storage = new DatabaseStorage();
