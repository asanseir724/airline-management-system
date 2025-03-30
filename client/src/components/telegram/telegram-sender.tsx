import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TelegramConfig } from "@shared/schema";
import { Loader2, Send } from "lucide-react";

export function TelegramSender() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");
  const [customerName, setCustomerName] = useState("");

  // بررسی وضعیت فعال بودن تلگرام
  const { data: config, isLoading: configLoading } = useQuery<TelegramConfig>({
    queryKey: ["/api/telegram-config"],
  });

  const sendMessage = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/telegram/send", {
        message,
        requestId: requestId ? parseInt(requestId) : null,
        customerName,
        requestType: "custom"
      }),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "پیام ارسال شد",
        description: "پیام با موفقیت به کانال تلگرام ارسال شد",
      });
      // پاک کردن فرم
      setMessage("");
      setRequestId("");
      setCustomerName("");
    },
    onError: (error) => {
      toast({
        title: "خطا در ارسال پیام",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: "خطا",
        description: "لطفا متن پیام را وارد کنید",
        variant: "destructive",
      });
      return;
    }
    sendMessage.mutate();
  };

  if (configLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!config?.isActive) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md">
            <p className="font-medium">اتصال تلگرام غیرفعال است</p>
            <p className="text-sm mt-1">برای ارسال پیام، ابتدا اتصال به تلگرام را فعال کنید.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          ارسال پیام به کانال تلگرام
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شناسه درخواست (اختیاری)
              </label>
              <Input
                type="number"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="شناسه درخواست مرتبط"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام مشتری (اختیاری)
              </label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="نام مشتری"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              متن پیام
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="متن پیام را وارد کنید..."
              required
            />
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={sendMessage.isPending} className="flex gap-2">
              {sendMessage.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  ارسال پیام
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}