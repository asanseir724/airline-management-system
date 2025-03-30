import axios from 'axios';
import dotenv from 'dotenv';
import { storage } from '../storage';
import { SmsHistory } from '@shared/schema';

dotenv.config();

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
      // دریافت تنظیمات پیامک از دیتابیس
      const smsSettings = await storage.getSmsSettings();
      
      // اگر تنظیمات پیامک وجود ندارد یا غیرفعال است، ارسال پیامک انجام نمی‌شود
      if (!smsSettings || !smsSettings.enabled) {
        console.log('SMS is disabled or settings not found');
        
        // ثبت در لاگ سیستم
        await storage.createSystemLog({
          level: 'warning',
          message: 'تلاش برای ارسال پیامک در حالی که سرویس غیرفعال است',
          module: 'sms-service',
          details: { 
            phoneNumber: this.formatPhoneNumber(phoneNumber),
            requestId: requestId || null,
            settingsFound: !!smsSettings,
            enabled: smsSettings?.enabled
          }
        });
        
        return {
          status: false,
          message: 'سرویس پیامک غیرفعال است یا تنظیمات یافت نشد',
        };
      }
      
      // فرمت شماره موبایل
      const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
      
      console.log('Sending SMS with token:', smsSettings.token);
      console.log('Formatted phone number:', formattedPhoneNumber);
      console.log('Message:', message);
      
      // ارسال درخواست به API با timeout 10 ثانیه
      const response = await axios.post(AMOOTSMS_API_URL, null, {
        params: {
          UserName: smsSettings.username || 'amoot',
          Password: smsSettings.password || '',
          Token: smsSettings.token,
          Mobile: formattedPhoneNumber,
          Message: message,
          Line: smsSettings.defaultLine || '980000000', // خط پیش‌فرض
          BackupLine: smsSettings.backupLine || '980000000', // خط پشتیبان
        },
        timeout: 10000, // 10 ثانیه timeout
      });

      console.log('AmootSMS API response:', response.data);

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
        
        // ثبت موفقیت در لاگ سیستم
        await storage.createSystemLog({
          level: 'info',
          message: `پیامک با موفقیت به ${formattedPhoneNumber} ارسال شد`,
          module: 'sms-service',
          details: { 
            messageId: messageId,
            requestId: requestId || null
          }
        });
      } else if (result && result.Message) {
        responseMessage = result.Message;
        
        // ثبت خطای API در لاگ سیستم
        await storage.createSystemLog({
          level: 'error',
          message: `خطا از سمت سرویس پیامک: ${responseMessage}`,
          module: 'sms-service',
          details: { 
            response: JSON.stringify(result),
            phoneNumber: formattedPhoneNumber,
            requestId: requestId || null
          }
        });
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
      
      let errorMessage = 'خطا در ارسال پیامک';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'زمان پاسخگویی سرور آموت پیامک به پایان رسید. لطفا مطمئن شوید IP سرور در سفیدلیست قرار دارد.';
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'ارتباط با سرور آموت پیامک برقرار نشد. لطفا اتصال اینترنت را بررسی کنید.';
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'خطای شبکه در ارتباط با سرور آموت پیامک. لطفا بعدا تلاش کنید.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // ذخیره خطا در تاریخچه
      await this.saveSmsHistory({
        phoneNumber: phoneNumber,
        content: message,
        status: 'failed',
        requestId: requestId || null,
      });
      
      // افزودن یک لاگ سیستم برای خطا
      try {
        await storage.createSystemLog({
          level: 'error',
          message: `خطا در ارسال پیامک به ${phoneNumber}: ${errorMessage}`,
          module: 'sms-service',
          details: { error: error instanceof Error ? error.message : 'خطای ناشناخته' }
        });
      } catch (logError) {
        console.error('Error creating system log:', logError);
      }
      
      return {
        status: false,
        message: errorMessage,
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
        const errorMessage = `الگوی پیامک '${templateName}' یافت نشد`;
        
        // ثبت خطا در لاگ سیستم
        await storage.createSystemLog({
          level: 'warning',
          message: errorMessage,
          module: 'sms-service',
          details: { templateName, requestId: requestId || null }
        });
        
        throw new Error(errorMessage);
      }
      
      // ارسال پیامک با استفاده از الگو
      return await this.sendSms(phoneNumber, template.content, requestId);
    } catch (error) {
      console.error('Error sending SMS template:', error);
      
      // اگر خطا در مرحله ارسال پیامک باشد، در تابع sendSms لاگ ثبت شده است
      // این بخش فقط خطاهایی را ثبت می‌کند که در بخش بالاتر رخ نداده باشند
      if (!(error instanceof Error && error.message.includes("یافت نشد"))) {
        try {
          await storage.createSystemLog({
            level: 'error',
            message: `خطا در ارسال پیامک با الگو به ${phoneNumber}`,
            module: 'sms-service',
            details: { 
              templateName, 
              requestId: requestId || null,
              error: error instanceof Error ? error.message : 'خطای ناشناخته' 
            }
          });
        } catch (logError) {
          console.error('Error creating system log:', logError);
        }
      }
      
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