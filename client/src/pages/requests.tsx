import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { RequestList } from "@/components/requests/request-list";

export default function Requests() {
  return (
    <AirlineLayout 
      title="مدیریت درخواست‌ها" 
      subtitle="مشاهده و مدیریت تمام درخواست‌های ثبت شده"
    >
      <RequestList />
    </AirlineLayout>
  );
}
