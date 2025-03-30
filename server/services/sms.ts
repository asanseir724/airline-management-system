import axios from 'axios';
import dotenv from 'dotenv';
import { storage } from '../storage';
import { SmsHistory } from '@shared/schema';

dotenv.config();

const AMOOTSMS_TOKEN = process.env.AMOOTSMS_TOKEN;
const AMOOTSMS_API_URL = 'https://portal.amootsms.com/webservice2.asmx/SendWithBackupLine_REST';

interface SmsResponse {
  status: boolean;
  message: string;
  messageId?: string;
}

/**
 * سرویس ارسال پیامک با استفاده از API آموت اس ام اس
 */
export class SmsService {
  /**
   * ارسال پیامک به شماره موبایل
   * @param phoneNumber شماره موبایل گیرنده
   * @param message متن پیامک
   * @param requestId شناسه درخواست (اختیاری)
   * @returns نتیجه ارسال پیامک
   */
  static async sendSms(phoneNumber: string, message: string, requestId?: number): Promise<SmsResponse> {
    try {
      // فرمت شماره موبایل
      const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
      
      // ارسال درخواست به API
      const response = await axios.post(AMOOTSMS_API_URL, null, {
        params: {
          UserName: 'amoot',
          Password: '',
          Token: AMOOTSMS_TOKEN,
          Mobile: formattedPhoneNumber,
          Message: message,
          Line: '980000000', // خط پیش‌فرض
          BackupLine: '980000000', // خط پشتیبان
        },
      });

      // پردازش پاسخ
      const result = response.data;
      let status = false;
      let responseMessage = 'خطا در ارسال پیامک';
      let messageId = undefined;

      // بررسی موفقیت آمیز بودن ارسال
      if (result && result.Status === 1) {
        status = true;
        responseMessage = 'پیامک با موفقیت ارسال شد';
        messageId = result.RetStatus?.toString();
      } else if (result && result.Message) {
        responseMessage = result.Message;
      }

      // ذخیره تاریخچه ارسال پیامک
      await this.saveSmsHistory({
        phoneNumber: formattedPhoneNumber,
        content: message,
        status: status ? 'sent' : 'failed',
        requestId: requestId || null,
      });

      return {
        status,
        message: responseMessage,
        messageId,
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // ذخیره خطا در تاریخچه
      await this.saveSmsHistory({
        phoneNumber: phoneNumber,
        content: message,
        status: 'failed',
        requestId: requestId || null,
      });
      
      return {
        status: false,
        message: error instanceof Error ? error.message : 'خطا در ارسال پیامک',
      };
    }
  }

  /**
   * ارسال پیامک با استفاده از الگوی ذخیره شده
   * @param phoneNumber شماره موبایل گیرنده
   * @param templateName نام الگو
   * @param requestId شناسه درخواست (اختیاری)
   * @returns نتیجه ارسال پیامک
   */
  static async sendSmsTemplate(phoneNumber: string, templateName: string, requestId?: number): Promise<SmsResponse> {
    try {
      // دریافت الگوی پیامک
      const templates = await storage.getSmsTemplates();
      const template = templates.find(t => t.name === templateName);
      
      if (!template) {
        throw new Error(`الگوی پیامک '${templateName}' یافت نشد`);
      }
      
      // ارسال پیامک با استفاده از الگو
      return await this.sendSms(phoneNumber, template.content, requestId);
    } catch (error) {
      console.error('Error sending SMS template:', error);
      return {
        status: false,
        message: error instanceof Error ? error.message : 'خطا در ارسال پیامک',
      };
    }
  }

  /**
   * ذخیره تاریخچه ارسال پیامک
   * @param history تاریخچه پیامک
   * @returns نتیجه ذخیره
   */
  private static async saveSmsHistory(history: {
    phoneNumber: string;
    content: string;
    status: string;
    requestId: number | null;
  }): Promise<SmsHistory> {
    return await storage.createSmsHistory(history);
  }

  /**
   * فرمت‌بندی شماره موبایل
   * @param phoneNumber شماره موبایل
   * @returns شماره موبایل فرمت‌بندی شده
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // حذف فضای خالی و کاراکترهای اضافی
    let formatted = phoneNumber.replace(/\s+/g, '').trim();
    
    // حذف پیش شماره +98 یا 0098
    if (formatted.startsWith('+98')) {
      formatted = formatted.substring(3);
    } else if (formatted.startsWith('0098')) {
      formatted = formatted.substring(4);
    } else if (formatted.startsWith('98')) {
      formatted = formatted.substring(2);
    }
    
    // حذف صفر ابتدایی
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    
    // اضافه کردن پیش شماره 98
    return '98' + formatted;
  }
}