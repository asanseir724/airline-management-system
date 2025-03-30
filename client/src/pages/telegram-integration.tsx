import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { TelegramConfiguration } from "@/components/telegram/telegram-config";
import { TelegramHistoryComponent } from "@/components/telegram/telegram-history";

export default function TelegramIntegration() {
  return (
    <AirlineLayout 
      title="اتصال به تلگرام" 
      subtitle="مدیریت اتصال به ربات تلگرام برای ارسال خودکار اطلاع‌رسانی‌ها"
    >
      <div className="space-y-6">
        <TelegramConfiguration />
        <TelegramHistoryComponent />
      </div>
    </AirlineLayout>
  );
}
