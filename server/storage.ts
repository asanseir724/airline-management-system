import {
  users, type User, type InsertUser, 
  requests, type Request, type InsertRequest,
  smsTemplates, type SmsTemplate, type InsertSmsTemplate,
  smsHistory, type SmsHistory, type InsertSmsHistory,
  telegramConfig, type TelegramConfig, type InsertTelegramConfig,
  telegramHistory, type TelegramHistory, type InsertTelegramHistory,
  backupHistory, type BackupHistory, type InsertBackupHistory,
  backupSettings, type BackupSettings, type InsertBackupSettings,
  customerRequests, type CustomerRequest, type InsertCustomerRequest
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private requests: Map<number, Request>;
  private customerRequests: Map<number, CustomerRequest>;
  private smsTemplates: Map<number, SmsTemplate>;
  private smsHistory: Map<number, SmsHistory>;
  private telegramConfig: Map<number, TelegramConfig>;
  private telegramHistory: Map<number, TelegramHistory>;
  private backupHistory: Map<number, BackupHistory>;
  private backupSettings: Map<number, BackupSettings>;
  
  sessionStore: session.SessionStore;
  
  private userCurrentId: number;
  private requestCurrentId: number;
  private customerRequestCurrentId: number;
  private smsTemplateCurrentId: number;
  private smsHistoryCurrentId: number;
  private telegramConfigCurrentId: number;
  private telegramHistoryCurrentId: number;
  private backupHistoryCurrentId: number;
  private backupSettingsCurrentId: number;

  constructor() {
    this.users = new Map();
    this.requests = new Map();
    this.customerRequests = new Map();
    this.smsTemplates = new Map();
    this.smsHistory = new Map();
    this.telegramConfig = new Map();
    this.telegramHistory = new Map();
    this.backupHistory = new Map();
    this.backupSettings = new Map();
    
    this.userCurrentId = 1;
    this.requestCurrentId = 1;
    this.customerRequestCurrentId = 1;
    this.smsTemplateCurrentId = 1;
    this.smsHistoryCurrentId = 1;
    this.telegramConfigCurrentId = 1;
    this.telegramHistoryCurrentId = 1;
    this.backupHistoryCurrentId = 1;
    this.backupSettingsCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Add some default SMS templates
    this.createSmsTemplate({
      name: "تایید درخواست",
      content: "✅ مشتری گرامی، درخواست شما تایید شد. با تشکر از اعتماد شما - شرکت هواپیمایی"
    });
    this.createSmsTemplate({
      name: "رد درخواست",
      content: "❌ مشتری گرامی، متاسفانه درخواست شما رد شد. لطفا برای اطلاعات بیشتر با پشتیبانی تماس بگیرید - شرکت هواپیمایی"
    });
    this.createSmsTemplate({
      name: "در حال بررسی",
      content: "✨ مشتری گرامی، درخواست شما با موفقیت ثبت شد و در حال بررسی است. با تشکر - شرکت هواپیمایی"
    });
    
    // Add default backup settings
    this.createBackupSettings({
      frequency: "daily",
      time: "00:00",
      autoDelete: false,
      isActive: true
    });
    
    // Add default telegram config
    this.createTelegramConfig({
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

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Request methods
  async getRequests(): Promise<Request[]> {
    return Array.from(this.requests.values());
  }
  
  async getRequestById(id: number): Promise<Request | undefined> {
    return this.requests.get(id);
  }
  
  async createRequest(insertRequest: InsertRequest): Promise<Request> {
    const id = this.requestCurrentId++;
    const now = new Date();
    const request: Request = {
      ...insertRequest,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    this.requests.set(id, request);
    return request;
  }
  
  async updateRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<Request | undefined> {
    const request = this.requests.get(id);
    if (!request) return undefined;
    
    const updatedRequest: Request = {
      ...request,
      status,
      updatedAt: new Date()
    };
    this.requests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // Customer Request methods
  async getCustomerRequests(): Promise<CustomerRequest[]> {
    return Array.from(this.customerRequests.values());
  }
  
  async getCustomerRequestById(id: number): Promise<CustomerRequest | undefined> {
    return this.customerRequests.get(id);
  }
  
  async createCustomerRequest(insertRequest: InsertCustomerRequest): Promise<CustomerRequest> {
    const id = this.customerRequestCurrentId++;
    const now = new Date();
    const request: CustomerRequest = {
      ...insertRequest,
      id,
      status: 'pending',
      createdAt: now
    };
    this.customerRequests.set(id, request);
    return request;
  }
  
  async updateCustomerRequestStatus(id: number, status: string): Promise<CustomerRequest | undefined> {
    const request = this.customerRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest: CustomerRequest = {
      ...request,
      status
    };
    this.customerRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // SMS Template methods
  async getSmsTemplates(): Promise<SmsTemplate[]> {
    return Array.from(this.smsTemplates.values());
  }
  
  async getSmsTemplateById(id: number): Promise<SmsTemplate | undefined> {
    return this.smsTemplates.get(id);
  }
  
  async createSmsTemplate(insertTemplate: InsertSmsTemplate): Promise<SmsTemplate> {
    const id = this.smsTemplateCurrentId++;
    const now = new Date();
    const template: SmsTemplate = {
      ...insertTemplate,
      id,
      createdAt: now
    };
    this.smsTemplates.set(id, template);
    return template;
  }
  
  async updateSmsTemplate(id: number, template: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined> {
    const existingTemplate = this.smsTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate: SmsTemplate = {
      ...existingTemplate,
      ...template
    };
    this.smsTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteSmsTemplate(id: number): Promise<boolean> {
    return this.smsTemplates.delete(id);
  }
  
  // SMS History methods
  async getSmsHistory(): Promise<SmsHistory[]> {
    return Array.from(this.smsHistory.values());
  }
  
  async createSmsHistory(insertHistory: InsertSmsHistory): Promise<SmsHistory> {
    const id = this.smsHistoryCurrentId++;
    const now = new Date();
    const history: SmsHistory = {
      ...insertHistory,
      id,
      createdAt: now
    };
    this.smsHistory.set(id, history);
    return history;
  }
  
  // Telegram Config methods
  async getTelegramConfig(): Promise<TelegramConfig | undefined> {
    if (this.telegramConfig.size === 0) return undefined;
    return Array.from(this.telegramConfig.values())[0]; // Return the first config
  }
  
  async createTelegramConfig(insertConfig: InsertTelegramConfig): Promise<TelegramConfig> {
    const id = this.telegramConfigCurrentId++;
    const now = new Date();
    const config: TelegramConfig = {
      ...insertConfig,
      id,
      updatedAt: now
    };
    this.telegramConfig.set(id, config);
    return config;
  }
  
  async updateTelegramConfig(id: number, config: Partial<InsertTelegramConfig>): Promise<TelegramConfig | undefined> {
    const existingConfig = this.telegramConfig.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: TelegramConfig = {
      ...existingConfig,
      ...config,
      updatedAt: new Date()
    };
    this.telegramConfig.set(id, updatedConfig);
    return updatedConfig;
  }
  
  // Telegram History methods
  async getTelegramHistory(): Promise<TelegramHistory[]> {
    return Array.from(this.telegramHistory.values());
  }
  
  async createTelegramHistory(insertHistory: InsertTelegramHistory): Promise<TelegramHistory> {
    const id = this.telegramHistoryCurrentId++;
    const now = new Date();
    const history: TelegramHistory = {
      ...insertHistory,
      id,
      createdAt: now
    };
    this.telegramHistory.set(id, history);
    return history;
  }
  
  // Backup History methods
  async getBackupHistory(): Promise<BackupHistory[]> {
    return Array.from(this.backupHistory.values());
  }
  
  async createBackupHistory(insertHistory: InsertBackupHistory): Promise<BackupHistory> {
    const id = this.backupHistoryCurrentId++;
    const now = new Date();
    const history: BackupHistory = {
      ...insertHistory,
      id,
      createdAt: now
    };
    this.backupHistory.set(id, history);
    return history;
  }
  
  async deleteBackupHistory(id: number): Promise<boolean> {
    return this.backupHistory.delete(id);
  }
  
  // Backup Settings methods
  async getBackupSettings(): Promise<BackupSettings | undefined> {
    if (this.backupSettings.size === 0) return undefined;
    return Array.from(this.backupSettings.values())[0]; // Return the first settings
  }
  
  async createBackupSettings(insertSettings: InsertBackupSettings): Promise<BackupSettings> {
    const id = this.backupSettingsCurrentId++;
    const now = new Date();
    const settings: BackupSettings = {
      ...insertSettings,
      id,
      updatedAt: now
    };
    this.backupSettings.set(id, settings);
    return settings;
  }
  
  async updateBackupSettings(id: number, settings: Partial<InsertBackupSettings>): Promise<BackupSettings | undefined> {
    const existingSettings = this.backupSettings.get(id);
    if (!existingSettings) return undefined;
    
    const updatedSettings: BackupSettings = {
      ...existingSettings,
      ...settings,
      updatedAt: new Date()
    };
    this.backupSettings.set(id, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();
