import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { SmsForm } from "@/components/sms/sms-form";
import { SmsTemplates } from "@/components/sms/sms-templates";
import { SmsHistoryComponent } from "@/components/sms/sms-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SmsManagement() {
  return (
    <AirlineLayout 
      title="مدیریت پیامک‌ها" 
      subtitle="ارسال پیامک به مشتریان و مدیریت الگوهای پیامک"
    >
      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px] mb-6">
          <TabsTrigger value="send">ارسال پیامک</TabsTrigger>
          <TabsTrigger value="history">تاریخچه پیامک‌ها</TabsTrigger>
        </TabsList>
        
        <TabsContent value="send">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <SmsForm />
            </div>
            <div className="md:col-span-1">
              <SmsTemplates />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <SmsHistoryComponent />
        </TabsContent>
      </Tabs>
    </AirlineLayout>
  );
}
