import { storage } from "../storage";
import { TelegramService } from "./telegram";
import { CustomerRequest } from "@shared/schema";

/**
 * سرویس گزارش‌گیری و آمار سیستم
 */
export class ReportService {
  /**
   * تهیه گزارش آماری از درخواست‌های مشتریان
   * @returns متن گزارش آماری قابل ارسال به تلگرام
   */
  static async generateCustomerRequestsReport(): Promise<string> {
    try {
      // دریافت تمام درخواست‌های مشتریان
      const requests = await storage.getCustomerRequests();
      
      // محاسبه آمارها
      const stats = this.calculateStats(requests);
      
      // محاسبه درصدها
      const totalRequests = requests.length;
      const percentageApproved = totalRequests ? Math.round((stats.approved / totalRequests) * 100) : 0;
      const percentageRejected = totalRequests ? Math.round((stats.rejected / totalRequests) * 100) : 0;
      const percentagePending = totalRequests ? Math.round((stats.pending / totalRequests) * 100) : 0;
      
      // تهیه متن گزارش
      const report = `📊 گزارش آماری سیستم استرداد وجه (${new Date().toLocaleString('fa-IR')})

📋 تعداد کل درخواست‌ها: ${totalRequests}
✅ تایید شده: ${stats.approved} (${percentageApproved}%)
❌ رد شده: ${stats.rejected} (${percentageRejected}%)
⏳ در حال بررسی: ${stats.pending} (${percentagePending}%)

🔹 درخواست‌های امروز: ${stats.today}
🔹 درخواست‌های هفته جاری: ${stats.thisWeek}
🔹 درخواست‌های ماه جاری: ${stats.thisMonth}

💼 گزارش سیستم مدیریت آژانس هواپیمایی
⏱️ گزارش بعدی در 3 ساعت آینده ارسال خواهد شد`;
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      return "خطا در تهیه گزارش آماری";
    }
  }
  
  /**
   * محاسبه آمار بر اساس وضعیت درخواست‌ها
   * @param requests لیست درخواست‌ها
   * @returns آمار درخواست‌ها بر اساس وضعیت
   */
  private static calculateStats(requests: CustomerRequest[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeekStart = new Date();
    thisWeekStart.setDate(today.getDate() - today.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return requests.reduce((stats, request) => {
      // آمار بر اساس وضعیت
      if (request.status === "approved") {
        stats.approved++;
      } else if (request.status === "rejected") {
        stats.rejected++;
      } else {
        stats.pending++;
      }
      
      // آمار بر اساس زمان
      const requestDate = new Date(request.createdAt);
      
      if (requestDate >= today) {
        stats.today++;
      }
      
      if (requestDate >= thisWeekStart) {
        stats.thisWeek++;
      }
      
      if (requestDate >= thisMonthStart) {
        stats.thisMonth++;
      }
      
      return stats;
    }, {
      approved: 0,
      rejected: 0,
      pending: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    });
  }
  
  /**
   * ارسال گزارش آماری به کانال تلگرام
   * @returns نتیجه ارسال گزارش
   */
  static async sendReportToTelegram(): Promise<boolean> {
    try {
      // بررسی وجود تنظیمات تلگرام
      const telegramConfig = await storage.getTelegramConfig();
      if (!telegramConfig || !telegramConfig.isActive) {
        console.error('Telegram configuration not found or inactive');
        await storage.createSystemLog({
          level: 'error',
          message: 'تنظیمات تلگرام یافت نشد یا غیرفعال است - گزارش ارسال نشد',
          module: 'report-service',
          details: {}
        });
        return false;
      }
      
      // تهیه گزارش
      const reportText = await this.generateCustomerRequestsReport();
      
      // ارسال به تلگرام
      const result = await TelegramService.sendMessage(reportText);
      
      if (result.status) {
        // ثبت لاگ موفقیت
        await storage.createSystemLog({
          level: 'info',
          message: 'گزارش آماری با موفقیت به تلگرام ارسال شد',
          module: 'report-service',
          details: {}
        });
        return true;
      } else {
        // ثبت لاگ خطا
        await storage.createSystemLog({
          level: 'error',
          message: `خطا در ارسال گزارش به تلگرام: ${result.message}`,
          module: 'report-service',
          details: {}
        });
        return false;
      }
    } catch (error) {
      console.error('Error sending report to Telegram:', error);
      // ثبت لاگ خطا
      await storage.createSystemLog({
        level: 'error',
        message: `خطای سیستمی در ارسال گزارش: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`,
        module: 'report-service',
        details: {}
      });
      return false;
    }
  }
}