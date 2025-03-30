import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChartBar, Loader2 } from "lucide-react";

export function TelegramReport() {
  const { toast } = useToast();
  
  const sendReport = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/reports/send"),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "گزارش ارسال شد",
        description: "گزارش آماری با موفقیت به کانال تلگرام ارسال شد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطا در ارسال گزارش",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendReport = () => {
    sendReport.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar className="h-5 w-5 text-primary" />
          گزارش آماری تلگرام
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
          <p className="text-sm mb-2">
            با استفاده از این قابلیت، یک گزارش آماری از وضعیت درخواست‌ها به کانال تلگرام ارسال خواهد شد.
          </p>
          <p className="text-sm text-gray-600">
            توجه: سیستم به صورت خودکار هر 3 ساعت یکبار، گزارشی از وضعیت درخواست‌ها به کانال تلگرام ارسال می‌کند.
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSendReport} 
            disabled={sendReport.isPending}
            className="flex gap-2"
          >
            {sendReport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ارسال گزارش...
              </>
            ) : (
              <>
                <ChartBar className="h-4 w-4" />
                ارسال گزارش آماری
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}