import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BackupHistory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Database } from "lucide-react";

export function BackupStatus() {
  const { toast } = useToast();
  
  const { data: backupHistory = [], isLoading } = useQuery<BackupHistory[]>({
    queryKey: ["/api/backup-history"],
  });
  
  // Sort by created date (descending) to get the latest backup
  const latestBackup = [...backupHistory]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
  const createBackup = useMutation({
    mutationFn: () => apiRequest("POST", "/api/backup"),
    onSuccess: async () => {
      toast({
        title: "بک‌آپ دستی با موفقیت ایجاد شد",
        description: "بک‌آپ جدید با موفقیت ایجاد شد",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/backup-history"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در ایجاد بک‌آپ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleManualBackup = () => {
    createBackup.mutate();
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center ml-4">
            <Database className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">وضعیت بک‌آپ</h3>
            <p className="text-sm text-green-600">فعال</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">آخرین بک‌آپ:</p>
            <p className="font-medium">
              {isLoading
                ? "در حال بارگذاری..."
                : latestBackup
                ? formatDate(new Date(latestBackup.createdAt))
                : "بک‌آپی وجود ندارد"}
            </p>
          </div>
          <Button 
            onClick={handleManualBackup} 
            disabled={createBackup.isPending}
          >
            {createBackup.isPending ? "در حال بک‌آپ‌گیری..." : "بک‌آپ دستی"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
