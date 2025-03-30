import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TelegramHistory } from "@shared/schema";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function TelegramHistoryComponent() {
  const { data: history, isLoading, isError, error } = useQuery<TelegramHistory[]>({
    queryKey: ["/api/telegram-history"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <p>خطا در دریافت تاریخچه: {error instanceof Error ? error.message : 'خطای ناشناخته'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          تاریخچه پیام‌های ارسال شده به تلگرام
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!history || history.length === 0) ? (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-md text-center">
            <p>هیچ پیامی در تاریخچه ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>نام مشتری</TableHead>
                  <TableHead>نوع درخواست</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>تاریخ ارسال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.customerName || '-'}</TableCell>
                    <TableCell>
                      {item.requestType === 'refund' && 'استرداد وجه'}
                      {item.requestType === 'payment' && 'پرداخت'}
                      {item.requestType === 'status_update' && 'به‌روزرسانی وضعیت'}
                      {item.requestType === 'custom' && 'پیام دستی'}
                      {!['refund', 'payment', 'status_update', 'custom'].includes(item.requestType || '') && item.requestType}
                    </TableCell>
                    <TableCell>
                      {item.status === 'sent' ? (
                        <Badge className="bg-green-500">ارسال شده</Badge>
                      ) : (
                        <Badge variant="destructive">ناموفق</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}