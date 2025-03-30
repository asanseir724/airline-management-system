import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SmsHistory } from '@shared/schema';
import { format } from 'date-fns-jalali';
import { Loader2, Search } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function SmsHistoryComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // دریافت تاریخچه پیامک‌ها
  const { data: smsHistory = [], isLoading } = useQuery<SmsHistory[]>({
    queryKey: ['/api/sms/history'],
    queryFn: async () => {
      const res = await fetch('/api/sms/history');
      if (!res.ok) throw new Error('خطا در دریافت تاریخچه پیامک‌ها');
      return res.json();
    }
  });

  // فیلتر کردن تاریخچه بر اساس جستجو
  const filteredHistory = smsHistory.filter(
    (item) =>
      item.phoneNumber.includes(searchQuery) ||
      item.content.includes(searchQuery) ||
      item.status.includes(searchQuery)
  );

  // پردازش پیجینیشن
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentItems = filteredHistory.slice(startIdx, endIdx);

  // تغییر صفحه
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // نمایش وضعیت ارسال پیامک
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500 hover:bg-green-600">ارسال شده</Badge>;
      case 'failed':
        return <Badge variant="destructive">ناموفق</Badge>;
      case 'pending':
        return <Badge variant="outline">در حال ارسال</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>تاریخچه پیامک‌ها</CardTitle>
        <CardDescription>لیست پیامک‌های ارسال شده</CardDescription>
      </CardHeader>
      <CardContent>
        {/* جستجو */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="جستجو در شماره موبایل، متن پیامک یا وضعیت..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* جدول تاریخچه */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery 
              ? 'هیچ نتیجه‌ای یافت نشد'
              : 'تاریخچه پیامک خالی است'}
          </div>
        ) : (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>شماره موبایل</TableHead>
                    <TableHead>متن پیامک</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>تاریخ ارسال</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium" dir="ltr">
                        {item.phoneNumber}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.content}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.createdAt), 'yyyy/MM/dd HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* پیجینیشن */}
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(Math.max(1, currentPage - 1));
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(page);
                        }}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(Math.min(totalPages, currentPage + 1));
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}