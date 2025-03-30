import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
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
  requestId: integer("request_id").references(() => requests.id),
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBackupSettingsSchema = createInsertSchema(backupSettings).pick({
  frequency: true,
  time: true,
  autoDelete: true,
  isActive: true,
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
