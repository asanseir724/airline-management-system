import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { SmsForm } from "@/components/sms/sms-form";
import { SmsTemplates } from "@/components/sms/sms-templates";

export default function SmsManagement() {
  return (
    <AirlineLayout 
      title="مدیریت پیامک‌ها" 
      subtitle="ارسال پیامک به مشتریان و مدیریت الگوهای پیامک"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <SmsForm />
        </div>
        <div className="md:col-span-1">
          <SmsTemplates />
        </div>
      </div>
    </AirlineLayout>
  );
}
