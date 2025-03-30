import * as cron from "node-cron";
import { storage } from "../storage";
import { ReportService } from "./report";
import { BackupService } from "./backup";

/**
 * سرویس زمان‌بندی برای اجرای وظایف دوره‌ای
 */
export class SchedulerService {
  private static reportTask: cron.ScheduledTask | null = null;
  private static backupTask: cron.ScheduledTask | null = null;

  /**
   * شروع زمان‌بندی‌های سیستم
   */
  static startSchedulers() {
    this.startReportScheduler();
    this.startBackupScheduler();
    
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
   * شروع زمان‌بندی بک‌آپ‌گیری خودکار
   */
  static async startBackupScheduler() {
    try {
      // توقف زمان‌بندی قبلی اگر وجود داشته باشد
      if (this.backupTask) {
        this.backupTask.stop();
      }
      
      // دریافت تنظیمات بک‌آپ
      const backupSettings = await storage.getBackupSettings();
      if (!backupSettings || !backupSettings.isActive) {
        console.log('Backup scheduler is disabled or settings not found');
        return;
      }
      
      // تعیین زمان اجرای بک‌آپ بر اساس فرکانس
      let cronExpression = '';
      const [hour, minute] = backupSettings.time.split(':');
      
      switch (backupSettings.frequency) {
        case 'daily':
          cronExpression = `${minute} ${hour} * * *`;
          break;
        case 'weekly':
          cronExpression = `${minute} ${hour} * * 1`; // هر دوشنبه
          break;
        case 'monthly':
          cronExpression = `${minute} ${hour} 1 * *`; // روز اول هر ماه
          break;
        default:
          cronExpression = `${minute} ${hour} * * *`; // روزانه به صورت پیش‌فرض
      }
      
      // ایجاد زمان‌بندی بک‌آپ‌گیری
      this.backupTask = cron.schedule(cronExpression, async () => {
        console.log(`Running scheduled backup task at ${new Date().toISOString()}`);
        
        try {
          // ایجاد و ارسال بک‌آپ
          const result = await BackupService.createAndSendBackup('automatic');
          
          if (result.success) {
            console.log('Scheduled backup created and sent successfully');
            
            // ثبت لاگ سیستم
            storage.createSystemLog({
              level: 'info',
              message: `بک‌آپ خودکار با موفقیت ایجاد و ارسال شد: ${result.filename}`,
              module: 'backup-service',
              details: { filename: result.filename }
            }).catch(logError => {
              console.error('Error logging backup success:', logError);
            });
          } else {
            console.error('Failed to create and send scheduled backup:', result.message);
            
            // ثبت لاگ خطا
            storage.createSystemLog({
              level: 'error',
              message: `خطا در ایجاد و ارسال بک‌آپ خودکار: ${result.message}`,
              module: 'backup-service',
              details: {}
            }).catch(logError => {
              console.error('Error logging backup error:', logError);
            });
          }
        } catch (error) {
          console.error('Error in scheduled backup task:', error);
          
          // ثبت لاگ خطا
          storage.createSystemLog({
            level: 'error',
            message: `خطا در اجرای بک‌آپ خودکار: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`,
            module: 'backup-service',
            details: {}
          }).catch(logError => {
            console.error('Error logging backup task error:', logError);
          });
        }
      });
      
      // شروع زمان‌بندی
      this.backupTask.start();
      console.log('Backup scheduler started successfully');
      
      // ثبت لاگ سیستم
      storage.createSystemLog({
        level: 'info',
        message: `سرویس بک‌آپ خودکار با برنامه ${backupSettings.frequency} در ساعت ${backupSettings.time} شروع به کار کرد`,
        module: 'backup-service',
        details: { frequency: backupSettings.frequency, time: backupSettings.time }
      }).catch(error => {
        console.error('Error logging backup scheduler start:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Error starting backup scheduler:', error);
      
      // ثبت لاگ خطا
      storage.createSystemLog({
        level: 'error',
        message: `خطا در شروع سرویس بک‌آپ خودکار: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`,
        module: 'backup-service',
        details: {}
      }).catch(logError => {
        console.error('Error logging backup scheduler error:', logError);
      });
      
      return false;
    }
  }
  
  /**
   * توقف تمام زمان‌بندی‌ها
   */
  static stopSchedulers() {
    if (this.reportTask) {
      this.reportTask.stop();
      this.reportTask = null;
    }
    
    if (this.backupTask) {
      this.backupTask.stop();
      this.backupTask = null;
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