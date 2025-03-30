import React, { useState } from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TourBrandRequest } from "@shared/schema";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TourBrandRequests() {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TourBrandRequest | null>(null);
  const { toast } = useToast();

  const { data: brandRequests = [], isLoading } = useQuery<TourBrandRequest[]>({
    queryKey: ["/api/tour-brand-requests"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tour-brand-requests/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-brand-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tour-brands"] });
      toast({
        title: "عملیات موفق",
        description: "وضعیت درخواست با موفقیت بروزرسانی شد",
      });
      setIsDetailsOpen(false);
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در بروزرسانی وضعیت درخواست رخ داد",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: number) => {
    updateStatusMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    updateStatusMutation.mutate({ id, status: "rejected" });
  };

  const handleViewDetails = (request: TourBrandRequest) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">در انتظار بررسی</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">تایید شده</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">رد شده</Badge>;
      default:
        return <Badge variant="outline">نامشخص</Badge>;
    }
  };

  const getPersianDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fa-IR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date as unknown as string);
    } catch (error) {
      return dateString;
    }
  };

  return (
    <AirlineLayout 
      title="درخواست‌های برند تور" 
      subtitle="مدیریت درخواست‌های برند تور از طرف آژانس‌ها"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableCaption>لیست درخواست‌های برند تور در سیستم</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شناسه</TableHead>
              <TableHead className="text-right">نام برند</TableHead>
              <TableHead className="text-right">نوع</TableHead>
              <TableHead className="text-right">تاریخ درخواست</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brandRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">هیچ درخواست برند توری ثبت نشده است</TableCell>
              </TableRow>
            ) : (
              brandRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.id}</TableCell>
                  <TableCell>{request.name}</TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {getPersianDate(request.createdAt)}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                    >
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>جزئیات درخواست برند تور</DialogTitle>
            <DialogDescription>
              اطلاعات کامل درخواست برند تور و تصمیم‌گیری در مورد آن
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>اطلاعات برند</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">نام برند:</div>
                      <div>{selectedRequest.name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">نوع برند:</div>
                      <div>{selectedRequest.type}</div>
                    </div>
                    {selectedRequest.telegramChannel && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">کانال تلگرام:</div>
                        <div>{selectedRequest.telegramChannel}</div>
                      </div>
                    )}
                    {selectedRequest.description && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">توضیحات:</div>
                        <div>{selectedRequest.description}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>اطلاعات تماس</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">اطلاعات تماس:</div>
                        <div>{selectedRequest.contactInfo}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">تاریخ درخواست:</div>
                        <div dir="ltr" className="text-right">
                          {getPersianDate(selectedRequest.createdAt)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">وضعیت فعلی:</div>
                        <div>{getStatusBadge(selectedRequest.status)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {selectedRequest.status === "pending" && (
                <Card>
                  <CardHeader>
                    <CardTitle>اقدام</CardTitle>
                    <CardDescription>
                      تصمیم خود را در مورد این درخواست مشخص کنید
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailsOpen(false)}
                    >
                      انصراف
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      رد درخواست
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      تایید و ایجاد برند
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {selectedRequest.status !== "pending" && (
                <Card>
                  <CardHeader>
                    <CardTitle>وضعیت درخواست</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center p-4">
                      {selectedRequest.status === "approved" ? (
                        <div className="flex flex-col items-center text-green-600">
                          <CheckCircle className="h-12 w-12 mb-2" />
                          <p className="text-lg">این درخواست تایید شده و برند در سیستم ایجاد شده است</p>
                        </div>
                      ) : selectedRequest.status === "rejected" ? (
                        <div className="flex flex-col items-center text-red-600">
                          <XCircle className="h-12 w-12 mb-2" />
                          <p className="text-lg">این درخواست رد شده است</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-yellow-600">
                          <Clock className="h-12 w-12 mb-2" />
                          <p className="text-lg">این درخواست در انتظار بررسی است</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailsOpen(false)}
                    >
                      بستن
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AirlineLayout>
  );
}