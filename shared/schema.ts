import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  isAdmin: true,
});

// Request statuses enum
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);

// Request types enum
export const requestTypeEnum = pgEnum("request_type", ["refund", "payment"]);

// Customer requests
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  ticketNumber: text("ticket_number").notNull(),
  requestType: requestTypeEnum("request_type").notNull(),
  description: text("description"),
  status: requestStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRequestSchema = createInsertSchema(requests).pick({
  customerName: true,
  phoneNumber: true,
  ticketNumber: true,
  requestType: true,
  description: true,
});

// SMS templates
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).pick({
  name: true,
  content: true,
});

// SMS history
export const smsHistory = pgTable("sms_history", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => requests.id),
  phoneNumber: text("phone_number").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull(), // 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSmsHistorySchema = createInsertSchema(smsHistory).pick({
  requestId: true,
  phoneNumber: true,
  content: true,
  status: true,
});

// Telegram configuration
export const telegramConfig = pgTable("telegram_config", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token").notNull(),
  channelId: text("channel_id").notNull(),
  messageFormat: text("message_format").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTelegramConfigSchema = createInsertSchema(telegramConfig).pick({
  botToken: true,
  channelId: true,
  messageFormat: true,
  isActive: true,
});

// Telegram message history
export const telegramHistory = pgTable("telegram_history", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => requests.id, { onDelete: 'set null' }),
  customerName: text("customer_name").notNull(),
  requestType: text("request_type").notNull(),
  status: text("status").notNull(), // 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTelegramHistorySchema = createInsertSchema(telegramHistory).pick({
  requestId: true,
  customerName: true,
  requestType: true,
  status: true,
});

// Backup history
export const backupHistory = pgTable("backup_history", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  size: text("size").notNull(),
  type: text("type").notNull(), // 'automatic', 'manual'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBackupHistorySchema = createInsertSchema(backupHistory).pick({
  filename: true,
  size: true,
  type: true,
});

// Backup settings
export const backupSettings = pgTable("backup_settings", {
  id: serial("id").primaryKey(),
  frequency: text("frequency").notNull(), // 'daily', 'weekly', 'monthly'
  time: text("time").notNull(), // 'HH:MM' format
  autoDelete: boolean("auto_delete").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  backupChannelId: text("backup_channel_id"), // آیدی کانال تلگرام برای بک‌آپ
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBackupSettingsSchema = createInsertSchema(backupSettings).pick({
  frequency: true,
  time: true,
  autoDelete: true,
  isActive: true,
  backupChannelId: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;

export type SmsHistory = typeof smsHistory.$inferSelect;
export type InsertSmsHistory = z.infer<typeof insertSmsHistorySchema>;

export type TelegramConfig = typeof telegramConfig.$inferSelect;
export type InsertTelegramConfig = z.infer<typeof insertTelegramConfigSchema>;

export type TelegramHistory = typeof telegramHistory.$inferSelect;
export type InsertTelegramHistory = z.infer<typeof insertTelegramHistorySchema>;

export type BackupHistory = typeof backupHistory.$inferSelect;
export type InsertBackupHistory = z.infer<typeof insertBackupHistorySchema>;

export type BackupSettings = typeof backupSettings.$inferSelect;
export type InsertBackupSettings = z.infer<typeof insertBackupSettingsSchema>;

// تنظیمات پیامک
export const smsSettings = pgTable("sms_settings", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  defaultLine: text("default_line").default("980000000"),
  backupLine: text("backup_line").default("980000000"),
  username: text("username").default(""),
  password: text("password").default(""),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSmsSettingsSchema = createInsertSchema(smsSettings).pick({
  token: true,
  defaultLine: true,
  backupLine: true,
  username: true,
  password: true,
  enabled: true,
});

export type SmsSettings = typeof smsSettings.$inferSelect;
export type InsertSmsSettings = z.infer<typeof insertSmsSettingsSchema>;

// لاگ سیستم
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // error, warn, info, debug
  message: text("message").notNull(),
  module: text("module"), // مدول/بخش برنامه که لاگ مربوط به آن است
  details: jsonb("details"), // جزئیات بیشتر به صورت JSON
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs, {
  details: z.record(z.string(), z.any()).optional(),
}).pick({
  level: true,
  message: true,
  module: true,
  details: true,
});

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

// CustomerRequest Schema
export const customerRequests = pgTable("customer_requests", {
  id: serial("id").primaryKey(),
  email: text("email"),
  website: text("website").notNull(),
  refundReason: text("refund_reason").notNull(),
  voucherNumber: text("voucher_number").notNull().unique(), // افزودن unique constraint برای جلوگیری از تکرار
  phoneNumber: text("phone_number").notNull(),
  ibanNumber: text("iban_number").notNull(),
  accountOwner: text("account_owner").notNull(),
  description: text("description"),
  contactedSupport: boolean("contacted_support").notNull().default(false),
  acceptTerms: boolean("accept_terms").notNull().default(false),
  status: text("status").notNull().default("pending"),
  trackingCode: text("tracking_code").notNull(), // کد پیگیری
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerRequestSchema = createInsertSchema(customerRequests).pick({
  email: true,
  website: true,
  refundReason: true,
  voucherNumber: true,
  phoneNumber: true,
  ibanNumber: true,
  accountOwner: true,
  description: true,
  contactedSupport: true,
  acceptTerms: true,
});

export type CustomerRequest = typeof customerRequests.$inferSelect;
export type InsertCustomerRequest = z.infer<typeof insertCustomerRequestSchema>;

// ================= تورهای گردشگری =================

// مقصدهای گردشگری
export const tourDestinations = pgTable("tour_destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTourDestinationSchema = createInsertSchema(tourDestinations).pick({
  name: true,
  active: true,
});

// برندهای همکار
export const tourBrands = pgTable("tour_brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // آژانس یا برند
  telegramChannel: text("telegram_channel"),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTourBrandSchema = createInsertSchema(tourBrands).pick({
  name: true,
  type: true,
  telegramChannel: true,
  description: true,
  active: true,
});

// درخواست‌های همکاری برند
export const tourBrandRequests = pgTable("tour_brand_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // آژانس یا برند
  telegramChannel: text("telegram_channel"),
  description: text("description"),
  contactInfo: text("contact_info").notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTourBrandRequestSchema = createInsertSchema(tourBrandRequests).pick({
  name: true,
  type: true,
  telegramChannel: true,
  description: true,
  contactInfo: true,
});

// تنظیمات تورهای گردشگری
export const tourSettings = pgTable("tour_settings", {
  id: serial("id").primaryKey(),
  avalaiApiKey: text("avalai_api_key").notNull(),
  telegramToken: text("telegram_token").notNull(),
  telegramChannels: text("telegram_channels").notNull(),
  timezone: text("timezone").default("Asia/Tehran").notNull(),
  intervalHours: integer("interval_hours").default(24).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTourSettingsSchema = createInsertSchema(tourSettings).pick({
  avalaiApiKey: true,
  telegramToken: true,
  telegramChannels: true,
  timezone: true,
  intervalHours: true,
});

// تاریخچه تورهای تولید شده
export const tourHistory = pgTable("tour_history", {
  id: serial("id").primaryKey(),
  destinationName: text("destination_name").notNull(),
  content: text("content").notNull(),
  status: text("status").default("sent").notNull(), // sent, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTourHistorySchema = createInsertSchema(tourHistory).pick({
  destinationName: true,
  content: true,
  status: true,
});

// لاگ‌های مربوط به تور
export const tourLogs = pgTable("tour_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // INFO, ERROR, WARNING
  message: text("message").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTourLogSchema = createInsertSchema(tourLogs).pick({
  level: true,
  message: true,
  content: true,
});

// Type definitions for tours
export type TourDestination = typeof tourDestinations.$inferSelect;
export type InsertTourDestination = z.infer<typeof insertTourDestinationSchema>;

export type TourBrand = typeof tourBrands.$inferSelect;
export type InsertTourBrand = z.infer<typeof insertTourBrandSchema>;

export type TourBrandRequest = typeof tourBrandRequests.$inferSelect;
export type InsertTourBrandRequest = z.infer<typeof insertTourBrandRequestSchema>;

export type TourSetting = typeof tourSettings.$inferSelect;
export type InsertTourSetting = z.infer<typeof insertTourSettingsSchema>;

export type TourHistory = typeof tourHistory.$inferSelect;
export type InsertTourHistory = z.infer<typeof insertTourHistorySchema>;

export type TourLog = typeof tourLogs.$inferSelect;
export type InsertTourLog = z.infer<typeof insertTourLogSchema>;

// Tour Sources (for scraping)
export const tourSources = pgTable("tour_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  active: boolean("active").default(true).notNull(),
  lastScraped: timestamp("last_scraped"),
  scrapingSelector: text("scraping_selector"),
  scrapingType: text("scraping_type").default("default").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTourSourceSchema = createInsertSchema(tourSources).pick({
  name: true,
  url: true,
  active: true,
  scrapingSelector: true,
  scrapingType: true,
});

export type TourSource = typeof tourSources.$inferSelect;
export type InsertTourSource = z.infer<typeof insertTourSourceSchema>;

// Tour Data (scraped information)
export const tourData = pgTable("tour_data", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => tourSources.id),
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  duration: text("duration"),
  imageUrl: text("image_url"),
  originalUrl: text("original_url"),
  destinationId: integer("destination_id").references(() => tourDestinations.id),
  brandId: integer("brand_id").references(() => tourBrands.id),
  isPublished: boolean("is_published").default(false).notNull(),
  metadata: jsonb("metadata"),
  services: jsonb("services"),
  hotels: jsonb("hotels"),
  requiredDocuments: jsonb("required_documents"),
  cancellationPolicy: text("cancellation_policy"),
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTourDataSchema = createInsertSchema(tourData).pick({
  sourceId: true,
  title: true,
  description: true,
  price: true,
  duration: true,
  imageUrl: true,
  originalUrl: true,
  destinationId: true,
  brandId: true,
  isPublished: true,
  metadata: true,
  services: true,
  hotels: true,
  requiredDocuments: true,
  cancellationPolicy: true,
});

export type TourData = typeof tourData.$inferSelect;
export type InsertTourData = z.infer<typeof insertTourDataSchema>;
