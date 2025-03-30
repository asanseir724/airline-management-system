import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Request, SmsTemplate } from "@shared/schema";
import { format } from "date-fns-jalali";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RequestDetailProps {
  request: Request;
  onClose: () => void;
}

export function RequestDetail({ request, onClose }: RequestDetailProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sendSms, setSendSms] = useState(true);

  // دریافت الگوهای پیامک
  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms/templates"],
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/requests/${request.id}/status`, { 
        status,
        sendSms: sendSms,
        smsTemplate: selectedTemplate || undefined
      }),
    onSuccess: async () => {
      toast({
        title: "وضعیت بروزرسانی شد",
        description: "وضعیت درخواست با موفقیت بروزرسانی شد",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "خطا در بروزرسانی وضعیت",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    updateStatus.mutate("approved");
  };

  const handleReject = () => {
    updateStatus.mutate("rejected");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">در انتظار</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">تایید شده</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">رد شده</Badge>;
      default:
        return null;
    }
  };

  const getRequestTypeText = (type: string) => {
    return type === "refund" ? "استرداد بلیط" : "واریز وجه";
  };

  return (
    <Dialog open={!!request} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>جزئیات درخواست</DialogTitle>
          <DialogDescription>
            اطلاعات کامل درخواست شماره {request.id}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <span className="block text-gray-500">شناسه درخواست</span>
            <span className="font-medium">{request.id}</span>
          </div>
          <div>
            <span className="block text-gray-500">تاریخ ثبت</span>
            <span className="font-medium">
              {format(new Date(request.createdAt), "yyyy/MM/dd HH:mm:ss")}
            </span>
          </div>
          <div>
            <span className="block text-gray-500">نام مشتری</span>
            <span className="font-medium">{request.customerName}</span>
          </div>
          <div>
            <span className="block text-gray-500">شماره تماس</span>
            <span className="font-medium">{request.phoneNumber}</span>
          </div>
          <div>
            <span className="block text-gray-500">نوع درخواست</span>
            <span className="font-medium">
              {getRequestTypeText(request.requestType)}
            </span>
          </div>
          <div>
            <span className="block text-gray-500">شماره بلیط</span>
            <span className="font-medium">{request.ticketNumber}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-gray-500 mb-1">توضیحات</span>
            <p className="font-medium">
              {request.description || "بدون توضیحات"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-gray-500 mb-1">وضعیت</span>
            {getStatusBadge(request.status)}
          </div>
          
          {request.status === "pending" && (
            <>
              <div className="sm:col-span-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="sendSms" 
                    checked={sendSms} 
                    onCheckedChange={(checked) => setSendSms(checked as boolean)}
                  />
                  <Label htmlFor="sendSms">ارسال پیامک به مشتری</Label>
                </div>
              </div>
              
              {sendSms && (
                <div className="sm:col-span-2">
                  <Label htmlFor="smsTemplate" className="block text-gray-500 mb-1">الگوی پیامک</Label>
                  <Select onValueChange={setSelectedTemplate}>
                    <SelectTrigger id="smsTemplate" className="w-full">
                      <SelectValue placeholder="انتخاب الگوی پیامک" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">الگوی پیش‌فرض بر اساس وضعیت</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.name}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          {request.status === "pending" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={updateStatus.isPending}
              >
                رد درخواست
              </Button>
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={updateStatus.isPending}
              >
                تایید درخواست
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}