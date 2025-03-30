import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BackupHistory } from "@shared/schema";
import { format } from "date-fns-jalali";
import { Download, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BackupHistoryComponent() {
  const { toast } = useToast();
  
  const { data: history = [], isLoading } = useQuery<BackupHistory[]>({
    queryKey: ["/api/backup-history"],
  });
  
  const deleteBackup = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/backup-history/${id}`),
    onSuccess: async () => {
      toast({
        title: "بک‌آپ با موفقیت حذف شد",
        description: "بک‌آپ انتخاب شده با موفقیت حذف شد",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/backup-history"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در حذف بک‌آپ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = (id: number) => {
    deleteBackup.mutate(id);
  };
  
  const handleDownload = (filename: string) => {
    // In a real app, this would trigger a download
    toast({
      title: "دانلود شروع شد",
      description: `دانلود فایل ${filename} شروع شد`,
    });
  };

  const columns = [
    {
      header: "نام فایل",
      accessorKey: "filename",
    },
    {
      header: "تاریخ ایجاد",
      accessorKey: "createdAt",
      cell: (row: BackupHistory) => format(new Date(row.createdAt), "yyyy/MM/dd HH:mm:ss"),
    },
    {
      header: "اندازه",
      accessorKey: "size",
    },
    {
      header: "نوع",
      accessorKey: "type",
      cell: (row: BackupHistory) => row.type === "automatic" ? "خودکار" : "دستی",
    },
    {
      header: "عملیات",
      accessorKey: (row: BackupHistory) => (
        <div className="flex space-x-2 space-x-reverse">
          <Button
            size="icon"
            variant="ghost"
            className="text-primary hover:text-secondary"
            onClick={() => handleDownload(row.filename)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleDelete(row.id)}
            disabled={deleteBackup.isPending}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>تاریخچه بک‌آپ‌ها</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={history}
          loading={isLoading}
          pagination={
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                نمایش {history.length > 0 ? "۱" : "۰"}-{history.length} از {history.length} مورد
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <Button size="sm" variant="outline" className="px-3 py-1" disabled>
                  قبلی
                </Button>
                <Button size="sm" className="px-3 py-1">
                  ۱
                </Button>
                <Button size="sm" variant="outline" className="px-3 py-1" disabled={history.length <= 10}>
                  بعدی
                </Button>
              </div>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
