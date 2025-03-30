import { useState } from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemLogsComponent } from "@/components/system/system-logs";
import { SmsSettingsComponent } from "@/components/sms/sms-settings";

export default function SystemManagement() {
  const [activeTab, setActiveTab] = useState("logs");
  
  return (
    <AirlineLayout 
      title="مدیریت سیستم" 
      subtitle="نظارت بر لاگ‌ها و تنظیمات سیستم"
    >
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="logs">لاگ‌های سیستم</TabsTrigger>
          <TabsTrigger value="sms-settings">تنظیمات پیامک</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logs" className="mt-0">
          <SystemLogsComponent />
        </TabsContent>
        
        <TabsContent value="sms-settings" className="mt-0">
          <SmsSettingsComponent />
        </TabsContent>
      </Tabs>
    </AirlineLayout>
  );
}