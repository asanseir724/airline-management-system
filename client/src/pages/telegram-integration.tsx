import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { TelegramConfiguration } from "@/components/telegram/telegram-config";
import { TelegramHistoryComponent } from "@/components/telegram/telegram-history";
import { TelegramSender } from "@/components/telegram/telegram-sender";
import { TelegramReport } from "@/components/telegram/telegram-report";

export default function TelegramIntegration() {
  return (
    <AirlineLayout 
      title="اتصال به تلگرام" 
      subtitle="مدیریت اتصال به ربات تلگرام برای ارسال خودکار اطلاع‌رسانی‌ها"
    >
      <div className="space-y-6">
        <TelegramConfiguration />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TelegramSender />
          <TelegramReport />
        </div>
        <TelegramHistoryComponent />
      </div>
    </AirlineLayout>
  );
}
