import * as cron from "node-cron";
import { storage } from "../storage";
import { ReportService } from "./report";

/**
 * سرویس زمان‌بندی برای اجرای وظایف دوره‌ای
 */
export class SchedulerService {
  private static reportTask: cron.ScheduledTask | null = null;

  /**
   * شروع زمان‌بندی‌های سیستم
   */
  static startSchedulers() {
    this.startReportScheduler();
    
    // ثبت لاگ سیستم
    storage.createSystemLog({
      level: 'info',
      message: 'سرویس زمان‌بندی شروع به کار کرد',
      module: 'scheduler-service',
      details: {}
    }).catch(error => {
      console.error('Error logging scheduler start:', error);
    });
    
    console.log('System schedulers started successfully');
  }
  
  /**
   * شروع زمان‌بندی ارسال گزارش‌های دوره‌ای
   */
  private static startReportScheduler() {
    // توقف زمان‌بندی قبلی اگر وجود داشته باشد
    if (this.reportTask) {
      this.reportTask.stop();
    }
    
    // ایجاد زمان‌بندی جدید - هر 3 ساعت یکبار
    // "0 */3 * * *" = دقیقه 0 از هر 3 ساعت در هر روز از هر ماه
    this.reportTask = cron.schedule("0 */3 * * *", async () => {
      console.log(`Running scheduled report task at ${new Date().toISOString()}`);
      
      try {
        // ارسال گزارش
        const success = await ReportService.sendReportToTelegram();
        
        if (success) {
          console.log('Scheduled report sent successfully');
        } else {
          console.error('Failed to send scheduled report');
        }
      } catch (error) {
        console.error('Error in scheduled report task:', error);
        
        // ثبت لاگ خطا
        storage.createSystemLog({
          level: 'error',
          message: `خطا در اجرای خودکار گزارش دوره‌ای: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`,
          module: 'scheduler-service',
          details: {}
        }).catch(logError => {
          console.error('Error logging scheduler error:', logError);
        });
      }
    });
    
    // شروع زمان‌بندی
    this.reportTask.start();
    console.log('Report scheduler started successfully');
  }
  
  /**
   * توقف تمام زمان‌بندی‌ها
   */
  static stopSchedulers() {
    if (this.reportTask) {
      this.reportTask.stop();
      this.reportTask = null;
    }
    
    // ثبت لاگ سیستم
    storage.createSystemLog({
      level: 'info',
      message: 'سرویس زمان‌بندی متوقف شد',
      module: 'scheduler-service',
      details: {}
    }).catch(error => {
      console.error('Error logging scheduler stop:', error);
    });
    
    console.log('System schedulers stopped successfully');
  }
}