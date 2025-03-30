import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { BackupStatus } from "@/components/backup/backup-status";
import { BackupSettingsComponent } from "@/components/backup/backup-settings";
import { BackupHistoryComponent } from "@/components/backup/backup-history";
import { BackupImport } from "@/components/backup/backup-import";

export default function Backup() {
  return (
    <AirlineLayout 
      title="بک‌آپ‌گیری" 
      subtitle="مدیریت بک‌آپ‌های خودکار و دستی سیستم"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <BackupStatus />
        <BackupSettingsComponent />
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">فضای ذخیره‌سازی</h3>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">فضای استفاده شده</span>
              <span className="text-sm font-medium">۲.۴ گیگابایت / ۱۰ گیگابایت</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: "24%" }}></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">بک‌آپ‌های دیتابیس</span>
              <span>۱.۸ گیگابایت</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">فایل‌های آپلود شده</span>
              <span>۰.۶ گیگابایت</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">سایر فایل‌ها</span>
              <span>۰.۱ گیگابایت</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <BackupHistoryComponent />
        <BackupImport />
      </div>
    </AirlineLayout>
  );
}
