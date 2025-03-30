import React, { useState } from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { RequestList } from "@/components/requests/request-list";
import { CustomerRequestsComponent } from "@/components/dashboard/customer-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Requests() {
  const [activeTab, setActiveTab] = useState("internal");
  
  return (
    <AirlineLayout 
      title="مدیریت درخواست‌ها" 
      subtitle="مشاهده و مدیریت تمام درخواست‌های ثبت شده"
    >
      <Tabs defaultValue="internal" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="internal">درخواست‌های داخلی</TabsTrigger>
          <TabsTrigger value="customer">درخواست‌های مشتریان</TabsTrigger>
        </TabsList>
        <TabsContent value="internal">
          <RequestList />
        </TabsContent>
        <TabsContent value="customer">
          <CustomerRequestsComponent />
        </TabsContent>
      </Tabs>
    </AirlineLayout>
  );
}
