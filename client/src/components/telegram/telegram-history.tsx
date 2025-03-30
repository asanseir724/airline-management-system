import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TelegramHistory } from "@shared/schema";
import { format } from "date-fns-jalali";

export function TelegramHistoryComponent() {
  const { data: history = [], isLoading } = useQuery<TelegramHistory[]>({
    queryKey: ["/api/telegram-history"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="outline" className="bg-green-100 text-green-800">ارسال شده</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-100 text-red-800">خطا در ارسال</Badge>;
      default:
        return null;
    }
  };
  
  const getRequestTypeText = (type: string) => {
    return type === "refund" ? "استرداد بلیط" : "واریز وجه";
  };

  const columns = [
    {
      header: "تاریخ و زمان",
      accessorKey: "createdAt",
      cell: (row: TelegramHistory) => format(new Date(row.createdAt), "yyyy/MM/dd HH:mm:ss"),
    },
    {
      header: "نام مشتری",
      accessorKey: "customerName",
    },
    {
      header: "نوع درخواست",
      accessorKey: "requestType",
      cell: (row: TelegramHistory) => getRequestTypeText(row.requestType),
    },
    {
      header: "وضعیت ارسال",
      accessorKey: "status",
      cell: (row: TelegramHistory) => getStatusBadge(row.status),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>تاریخچه ارسال‌ها</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={history}
          loading={isLoading}
          pagination={
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                نمایش {history.length > 0 ? "۱" : "۰"}-{history.length} از {history.length} مورد
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <Button size="sm" variant="outline" className="px-3 py-1" disabled>
                  قبلی
                </Button>
                <Button size="sm" className="px-3 py-1">
                  ۱
                </Button>
                <Button size="sm" variant="outline" className="px-3 py-1" disabled={history.length <= 10}>
                  بعدی
                </Button>
              </div>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
