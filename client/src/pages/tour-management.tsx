import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  MapPin,
  Tag,
  ClipboardList,
  Settings,
  Database,
  Clock
} from "lucide-react";

export default function TourManagement() {
  const [, setLocation] = useLocation();

  const managementCards = [
    {
      title: "مدیریت مقصدهای گردشگری",
      description: "افزودن، ویرایش و حذف مقصدهای گردشگری",
      icon: <MapPin className="h-10 w-10 text-primary" />,
      link: "/tour-destinations",
    },
    {
      title: "مدیریت برندهای تور",
      description: "افزودن، ویرایش و حذف برندهای همکار تور",
      icon: <Tag className="h-10 w-10 text-primary" />,
      link: "/tour-brands",
    },
    {
      title: "درخواست‌های برند تور",
      description: "مدیریت درخواست‌های ثبت برند تور جدید",
      icon: <ClipboardList className="h-10 w-10 text-primary" />,
      link: "/tour-brand-requests",
    },
    {
      title: "تنظیمات تور",
      description: "تنظیم API و پارامترهای سیستم تور",
      icon: <Settings className="h-10 w-10 text-primary" />,
      link: "/tour-settings",
    },
    {
      title: "تاریخچه تور",
      description: "مشاهده تاریخچه ارسال اطلاعات تور",
      icon: <Database className="h-10 w-10 text-primary" />,
      link: "/tour-history",
    },
    {
      title: "گزارش‌های سیستم تور",
      description: "مشاهده رویدادها و گزارش‌های سیستم تور",
      icon: <Clock className="h-10 w-10 text-primary" />,
      link: "/tour-logs",
    },
  ];

  return (
    <AirlineLayout 
      title="مدیریت تورهای گردشگری" 
      subtitle="سیستم مدیریت تورهای گردشگری"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managementCards.map((card) => (
          <Card 
            key={card.link}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setLocation(card.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <CardDescription className="min-h-[50px]">
                {card.description}
              </CardDescription>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(card.link);
                }}
              >
                ورود به بخش
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AirlineLayout>
  );
}