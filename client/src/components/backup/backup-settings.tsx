import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BackupSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function BackupSettingsComponent() {
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery<BackupSettings>({
    queryKey: ["/api/backup-settings"],
  });
  
  const [formData, setFormData] = useState<Partial<BackupSettings>>({
    frequency: "daily",
    time: "00:00",
    autoDelete: false,
    isActive: true
  });
  
  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        frequency: settings.frequency,
        time: settings.time,
        autoDelete: settings.autoDelete,
        isActive: settings.isActive
      });
    }
  }, [settings]);
  
  const updateSettings = useMutation({
    mutationFn: () => 
      apiRequest("PATCH", `/api/backup-settings/${settings?.id}`, formData),
    onSuccess: async () => {
      toast({
        title: "تنظیمات با موفقیت بروزرسانی شد",
        description: "تنظیمات بک‌آپ با موفقیت بروزرسانی شد",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/backup-settings"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در بروزرسانی تنظیمات",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFrequencyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, frequency: value }));
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, time: e.target.value }));
  };
  
  const handleAutoDeleteChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, autoDelete: checked }));
  };
  
  const handleSubmit = () => {
    updateSettings.mutate();
  };

  if (isLoading) {
    return <div>در حال بارگذاری...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تنظیمات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                زمان‌بندی بک‌آپ
              </label>
              <span className="text-xs text-gray-500">
                فعلی: {formData.frequency === "daily" 
                  ? "روزانه" 
                  : formData.frequency === "weekly" 
                    ? "هفتگی" 
                    : "ماهانه"}
              </span>
            </div>
            <Select value={formData.frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">روزانه</SelectItem>
                <SelectItem value="weekly">هفتگی</SelectItem>
                <SelectItem value="monthly">ماهانه</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                ساعت بک‌آپ‌گیری
              </label>
              <span className="text-xs text-gray-500">
                فعلی: {formData.time}
              </span>
            </div>
            <Input
              type="time"
              value={formData.time}
              onChange={handleTimeChange}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              حذف خودکار بک‌آپ‌های قدیمی‌تر از ۳۰ روز
            </label>
            <Switch
              checked={formData.autoDelete}
              onCheckedChange={handleAutoDeleteChange}
            />
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={handleSubmit}
              className="w-full"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
