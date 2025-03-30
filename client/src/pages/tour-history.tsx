import React, { useState } from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { TourHistory } from "@shared/schema";
import { Loader2, RefreshCw, Search, Eye } from "lucide-react";

export default function TourHistoryPage() {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<TourHistory | null>(null);

  const { 
    data: historyItems = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<TourHistory[]>({
    queryKey: ["/api/tour-history"],
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">ارسال شده</span>;
      case "failed":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">ناموفق</span>;
      case "pending":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">در انتظار</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date as any);
  };

  const handleViewDetails = (history: TourHistory) => {
    setSelectedHistory(history);
    setIsDetailsOpen(true);
  };

  return (
    <AirlineLayout 
      title="تاریخچه تورها" 
      subtitle="تاریخچه ارسال اطلاعات تور به کانال‌های تلگرامی"
    >
      <div className="mb-4 flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 text-red-800 rounded-md">
          خطا در دریافت تاریخچه تورها
        </div>
      ) : (
        <Table>
          <TableCaption>تاریخچه ارسال اطلاعات تور</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شناسه</TableHead>
              <TableHead className="text-right">مقصد</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">تاریخ ارسال</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">تاریخچه‌ای ثبت نشده است</TableCell>
              </TableRow>
            ) : (
              historyItems.map((history) => (
                <TableRow key={history.id}>
                  <TableCell>{history.id}</TableCell>
                  <TableCell>{history.destinationName}</TableCell>
                  <TableCell>{getStatusBadge(history.status)}</TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {formatDate(history.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewDetails(history)}
                    >
                      <Eye className="h-4 w-4 ml-1" />
                      مشاهده جزئیات
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>جزئیات ارسال</DialogTitle>
            <DialogDescription>
              جزئیات ارسال اطلاعات تور به کانال‌های تلگرامی
            </DialogDescription>
          </DialogHeader>
          
          {selectedHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">مقصد:</div>
                <div>{selectedHistory.destinationName}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">وضعیت:</div>
                <div>{getStatusBadge(selectedHistory.status)}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">تاریخ ارسال:</div>
                <div dir="ltr" className="text-right">
                  {formatDate(selectedHistory.createdAt)}
                </div>
              </div>
              
              <div>
                <div className="font-medium mb-2">محتوای ارسال شده:</div>
                <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-80 whitespace-pre-wrap border text-sm">
                  {selectedHistory.content}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AirlineLayout>
  );
}