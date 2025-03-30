import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TelegramConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Send } from "lucide-react";

export function TelegramConfiguration() {
  const { toast } = useToast();
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  
  const { data: config, isLoading } = useQuery<TelegramConfig>({
    queryKey: ["/api/telegram-config"],
  });
  
  const [formData, setFormData] = useState<Partial<TelegramConfig>>({
    botToken: "",
    channelId: "-1001234567890", // آیدی عددی کانال خصوصی
    messageFormat: `✈️ درخواست جدید
                         
👤 نام مشتری: {customer_name}
📱 شماره تماس: {phone_number}
🎫 شماره بلیط: {ticket_number}
📝 نوع درخواست: {request_type}
                       
توضیحات: {description}`,
    isActive: true
  });
  
  // Update form data when config is loaded
  React.useEffect(() => {
    if (config) {
      setFormData({
        botToken: config.botToken,
        channelId: config.channelId,
        messageFormat: config.messageFormat,
        isActive: config.isActive
      });
    }
  }, [config]);
  
  const updateConfig = useMutation({
    mutationFn: () => 
      apiRequest("PATCH", `/api/telegram-config/${config?.id}`, formData),
    onSuccess: async () => {
      toast({
        title: "تنظیمات با موفقیت بروزرسانی شد",
        description: "تنظیمات تلگرام با موفقیت بروزرسانی شد",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/telegram-config"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در بروزرسانی تنظیمات",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig.mutate();
  };
  
  const toggleTokenVisibility = () => {
    setIsTokenVisible(!isTokenVisible);
  };

  if (isLoading) {
    return <div>در حال بارگذاری...</div>;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-primary bg-opacity-20 flex items-center justify-center ml-4">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">وضعیت اتصال به ربات تلگرام</h3>
              <p className="text-sm text-green-600">
                {formData.isActive ? "متصل" : "غیرفعال"}
                {formData.isActive && " (آخرین فعالیت: امروز)"}
              </p>
            </div>
          </div>
          <div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
            />
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  توکن ربات
                </label>
                <div className="flex">
                  <Input
                    type={isTokenVisible ? "text" : "password"}
                    name="botToken"
                    value={formData.botToken}
                    onChange={handleInputChange}
                    className="rounded-l-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-r-none"
                    onClick={toggleTokenVisibility}
                  >
                    {isTokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  آیدی عددی کانال
                </label>
                <Input
                  type="text"
                  name="channelId"
                  value={formData.channelId}
                  onChange={handleInputChange}
                  placeholder="-1001234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  برای کانال‌های خصوصی باید از آیدی عددی استفاده کنید. مثال: -1001234567890
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                قالب پیام ارسالی
              </label>
              <Textarea
                name="messageFormat"
                value={formData.messageFormat}
                onChange={handleInputChange}
                rows={8}
              />
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? "در حال بروزرسانی..." : "بروزرسانی تنظیمات"}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
