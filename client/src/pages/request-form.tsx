import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { RequestFormComponent } from "@/components/requests/request-form";

export default function RequestForm() {
  return (
    <AirlineLayout 
      title="فرم ثبت درخواست جدید" 
      subtitle="برای مشتریان فرم درخواست استرداد بلیط یا واریز وجه را تکمیل کنید"
    >
      <RequestFormComponent />
    </AirlineLayout>
  );
}
