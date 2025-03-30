import axios from 'axios';
import { storage } from '../storage';

interface TelegramResponse {
  status: boolean;
  message: string;
  messageId?: string;
  data?: any;
}

/**
 * سرویس ارسال پیام به تلگرام
 */
export class TelegramService {
  /**
   * ارسال پیام تور به کانال تلگرام با استفاده از تنظیمات تور
   * @param message متن پیام
   * @param tourTitle عنوان تور
   * @returns نتیجه ارسال پیام
   */
  static async sendTourMessage(
    message: string,
    tourTitle: string
  ): Promise<TelegramResponse> {
    try {
      // دریافت تنظیمات تور
      const tourSettings = await storage.getTourSettings();
      
      if (!tourSettings) {
        return {
          status: false,
          message: 'تنظیمات تور یافت نشد'
        };
      }

      // استخراج آیدی کانال و توکن ربات
      const channelId = tourSettings.telegramChannels;
      const botToken = tourSettings.telegramToken;

      // ارسال پیام به کانال
      const response = await this.sendMessageToChannel(message, channelId, botToken);

      if (response.data && response.data.ok) {
        // ثبت لاگ موفقیت
        await storage.createTourLog({
          level: "INFO",
          message: `تور "${tourTitle}" با موفقیت به تلگرام ارسال شد`,
          content: message.substring(0, 200) + "..."
        });

        return {
          status: true,
          message: 'پیام تور با موفقیت ارسال شد',
          messageId: response.data.result?.message_id?.toString()
        };
      } else {
        throw new Error(response.data?.description || 'خطا در ارسال پیام تور به تلگرام');
      }
    } catch (error) {
      console.error('خطا در ارسال پیام تور به تلگرام:', error);
      
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: "ERROR",
        message: `خطا در ارسال تور "${tourTitle}" به تلگرام`,
        content: error instanceof Error ? error.message : 'خطای ناشناخته'
      });

      return {
        status: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در ارسال پیام تور به تلگرام'
      };
    }
  }

  /**
   * ارسال پیام به کانال تلگرام
   * @param message متن پیام
   * @param requestId شناسه درخواست (اختیاری)
   * @param customerName نام مشتری
   * @param requestType نوع درخواست
   * @returns نتیجه ارسال پیام
   */
  static async sendMessage(
    message: string,
    requestId?: number,
    customerName: string = '',
    requestType: string = 'request'
  ): Promise<TelegramResponse> {
    try {
      // دریافت تنظیمات تلگرام
      const config = await storage.getTelegramConfig();
      
      if (!config || !config.isActive) {
        return {
          status: false,
          message: 'سرویس تلگرام غیرفعال است یا تنظیمات یافت نشد'
        };
      }

      // ارسال پیام به کانال
      const response = await this.sendMessageToChannel(message, config.channelId, config.botToken);

      if (response.data && response.data.ok) {
        // ثبت در تاریخچه
        await this.saveHistory({
          requestId,
          customerName,
          requestType,
          status: 'sent'
        });

        return {
          status: true,
          message: 'پیام با موفقیت ارسال شد',
          messageId: response.data.result?.message_id?.toString()
        };
      } else {
        throw new Error(response.data?.description || 'خطا در ارسال پیام تلگرام');
      }
    } catch (error) {
      console.error('خطا در ارسال پیام تلگرام:', error);
      
      // ثبت در تاریخچه
      await this.saveHistory({
        requestId,
        customerName,
        requestType,
        status: 'failed'
      });

      return {
        status: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در ارسال پیام تلگرام'
      };
    }
  }

  /**
   * ذخیره تاریخچه ارسال پیام تلگرام
   * @param history تاریخچه پیام
   * @returns نتیجه ذخیره
   */
  private static async saveHistory(history: {
    requestId?: number;
    customerName: string;
    requestType: string;
    status: string;
  }) {
    try {
      await storage.createTelegramHistory({
        requestId: history.requestId,
        customerName: history.customerName,
        requestType: history.requestType,
        status: history.status
      });
      return true;
    } catch (error) {
      console.error('خطا در ذخیره تاریخچه تلگرام:', error);
      return false;
    }
  }
  
  /**
   * ارسال پیام به کانال تلگرام با پارامترهای ورودی
   * @param message متن پیام
   * @param chatId آیدی چت یا کانال
   * @param botToken توکن ربات
   * @returns نتیجه ارسال پیام
   */
  static async sendMessageToChannel(
    message: string,
    chatId: string,
    botToken: string
  ): Promise<TelegramResponse> {
    try {
      // ساخت URL برای API تلگرام
      const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      // ارسال پیام
      const response = await axios.post(apiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      }, {
        timeout: 10000 // تایم‌اوت 10 ثانیه
      });
      
      if (response.data && response.data.ok) {
        return {
          status: true,
          message: 'پیام با موفقیت ارسال شد',
          messageId: response.data.result?.message_id?.toString(),
          data: response.data
        };
      } else {
        throw new Error(response.data?.description || 'خطا در ارسال پیام تلگرام');
      }
    } catch (error) {
      console.error('خطا در ارسال پیام به کانال تلگرام:', error);
      return {
        status: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در ارسال پیام به کانال تلگرام'
      };
    }
  }
}