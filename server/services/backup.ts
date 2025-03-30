import { storage } from '../storage';
import { TelegramService } from './telegram';
import fs from 'fs';
import path from 'path';
import { CustomerRequest, Request, SmsHistory, TelegramHistory } from '@shared/schema';

/**
 * سرویس بک‌آپ‌گیری سیستم
 */
export class BackupService {
  /**
   * تهیه بک‌آپ از اطلاعات و ارسال به تلگرام
   * @param type نوع بک‌آپ (خودکار یا دستی)
   * @returns نتیجه تهیه و ارسال بک‌آپ
   */
  static async createAndSendBackup(type: 'automatic' | 'manual' = 'manual'): Promise<{
    success: boolean;
    message: string;
    filename?: string;
  }> {
    try {
      // دریافت تنظیمات بک‌آپ
      const backupSettings = await storage.getBackupSettings();
      
      if (!backupSettings || !backupSettings.isActive) {
        return {
          success: false,
          message: 'سیستم بک‌آپ غیرفعال است یا تنظیمات یافت نشد'
        };
      }
      
      // دریافت داده‌های مهم سیستم
      const customerRequests = await storage.getCustomerRequests();
      const requests = await storage.getRequests();
      const smsHistory = await storage.getSmsHistory();
      const telegramHistory = await storage.getTelegramHistory();
      
      // تهیه فایل بک‌آپ
      const timestamp = new Date().toISOString().replace(/[:.]/g, '');
      const filename = `backup_${timestamp}.json`;
      const tempDir = path.join(__dirname, '../../temp');
      const filePath = path.join(tempDir, filename);
      
      // ایجاد دایرکتوری موقت اگر وجود ندارد
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // ساخت محتوای بک‌آپ
      const backupData = {
        timestamp: new Date().toISOString(),
        customerRequests,
        requests,
        smsHistory,
        telegramHistory
      };
      
      // ذخیره فایل بک‌آپ
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
      
      // محاسبه حجم فایل
      const fileStats = fs.statSync(filePath);
      const fileSizeInMB = (fileStats.size / (1024 * 1024)).toFixed(2);
      
      // ارسال فایل به تلگرام
      const backupMessage = `
<b>🔄 بک‌آپ سیستم مدیریت آژانس هواپیمایی</b>

<b>📅 تاریخ:</b> ${new Date().toLocaleString('fa-IR')}
<b>⚙️ نوع بک‌آپ:</b> ${type === 'automatic' ? 'خودکار' : 'دستی'}
<b>📊 آمار اطلاعات:</b>
- تعداد درخواست‌های مشتریان: ${customerRequests.length}
- تعداد درخواست‌های داخلی: ${requests.length}
- تعداد پیامک‌های ارسالی: ${smsHistory.length}
- تعداد پیام‌های تلگرامی: ${telegramHistory.length}

<b>💾 حجم فایل:</b> ${fileSizeInMB} مگابایت
`;

      // ارسال پیام به تلگرام
      const telegramResponse = await this.sendBackupToTelegram(backupMessage, filePath, backupSettings.backupChannelId || undefined);
      
      // حذف فایل موقت
      fs.unlinkSync(filePath);
      
      if (telegramResponse.success) {
        // ثبت در تاریخچه بک‌آپ
        await storage.createBackupHistory({
          filename,
          size: `${fileSizeInMB} مگابایت`,
          type
        });
        
        return {
          success: true,
          message: 'بک‌آپ با موفقیت تهیه و ارسال شد',
          filename
        };
      } else {
        throw new Error(telegramResponse.message);
      }
    } catch (error) {
      console.error('خطا در تهیه و ارسال بک‌آپ:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در تهیه و ارسال بک‌آپ'
      };
    }
  }
  
  /**
   * ارسال فایل بک‌آپ به کانال تلگرام
   * @param message پیام همراه با فایل
   * @param filePath مسیر فایل
   * @param channelId آیدی کانال تلگرام
   * @returns نتیجه ارسال به تلگرام
   */
  private static async sendBackupToTelegram(
    message: string,
    filePath: string,
    channelId?: string | null
  ): Promise<{ success: boolean; message: string }> {
    try {
      // دریافت تنظیمات تلگرام
      const telegramConfig = await storage.getTelegramConfig();
      
      if (!telegramConfig || !telegramConfig.isActive) {
        return {
          success: false,
          message: 'سرویس تلگرام غیرفعال است یا تنظیمات یافت نشد'
        };
      }
      
      // استفاده از کانال بک‌آپ اگر مشخص شده باشد، در غیر این صورت از کانال اصلی استفاده می‌شود
      const chatId = channelId || telegramConfig.channelId;
      
      if (!chatId) {
        return {
          success: false,
          message: 'آیدی کانال تلگرام برای بک‌آپ مشخص نشده است'
        };
      }
      
      // ارسال پیام
      const messageResponse = await TelegramService.sendMessageToChannel(
        message,
        chatId,
        telegramConfig.botToken
      );
      
      if (!messageResponse.status) {
        throw new Error(`خطا در ارسال پیام: ${messageResponse.message}`);
      }
      
      // ارسال فایل
      const fileResponse = await this.sendFileToTelegram(
        filePath,
        chatId,
        telegramConfig.botToken
      );
      
      if (!fileResponse.success) {
        throw new Error(`خطا در ارسال فایل: ${fileResponse.message}`);
      }
      
      return {
        success: true,
        message: 'بک‌آپ با موفقیت به تلگرام ارسال شد'
      };
    } catch (error) {
      console.error('خطا در ارسال بک‌آپ به تلگرام:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در ارسال بک‌آپ به تلگرام'
      };
    }
  }
  
  /**
   * ارسال فایل به تلگرام
   * @param filePath مسیر فایل
   * @param chatId آیدی چت
   * @param botToken توکن ربات
   * @returns نتیجه ارسال فایل
   */
  private static async sendFileToTelegram(
    filePath: string,
    chatId: string,
    botToken: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      
      // تبدیل بافر به بلاب فایل
      const fileBlob = new Blob([fileBuffer], { type: 'application/json' });
      
      formData.append('chat_id', chatId);
      formData.append('document', fileBlob, fileName);
      
      // استفاده از API sendDocument تلگرام
      const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
      
      // ارسال درخواست با axios
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || 'خطا در ارسال فایل به تلگرام');
      }
      
      return {
        success: true,
        message: 'فایل با موفقیت ارسال شد'
      };
    } catch (error) {
      console.error('خطا در ارسال فایل به تلگرام:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در ارسال فایل به تلگرام'
      };
    }
  }
}