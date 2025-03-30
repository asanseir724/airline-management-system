import React from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TourLog } from "@shared/schema";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TourLogs() {
  const { toast } = useToast();

  const { 
    data: logs = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<TourLog[]>({
    queryKey: ["/api/tour-logs"],
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/tour-logs/clear");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-logs"] });
      toast({
        title: "گزارش‌ها پاک شدند",
        description: "تمام گزارش‌های تور با موفقیت پاک شدند",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "در پاک کردن گزارش‌ها خطایی رخ داد",
        variant: "destructive",
      });
    },
  });

  const handleClearLogs = () => {
    clearLogsMutation.mutate();
  };

  const getLogLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case "info":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">اطلاعات</span>;
      case "warning":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">هشدار</span>;
      case "error":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">خطا</span>;
      case "debug":
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">دیباگ</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{level}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date as any);
  };

  return (
    <AirlineLayout 
      title="گزارش‌های سیستم تور" 
      subtitle="رویدادها و گزارش‌های سیستم تور"
    >
      <div className="mb-4 flex justify-between items-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 ml-2" />
              پاک کردن همه گزارش‌ها
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>پاک کردن گزارش‌ها</AlertDialogTitle>
              <AlertDialogDescription>
                آیا مطمئن هستید که می‌خواهید تمام گزارش‌های سیستم تور را پاک کنید؟ این عمل غیرقابل بازگشت است.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleClearLogs}
                disabled={clearLogsMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {clearLogsMutation.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                تایید
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 text-red-800 rounded-md">
          خطا در دریافت گزارش‌ها
        </div>
      ) : (
        <Table>
          <TableCaption>گزارش‌های سیستم تور</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شناسه</TableHead>
              <TableHead className="text-right">سطح</TableHead>
              <TableHead className="text-right">پیام</TableHead>
              <TableHead className="text-right">تاریخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">گزارشی ثبت نشده است</TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{getLogLevelBadge(log.level)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs overflow-hidden text-ellipsis">
                      {log.message}
                      {log.content && (
                        <div className="mt-1 text-xs text-gray-500 overflow-hidden text-ellipsis">
                          {typeof log.content === 'string' 
                            ? log.content 
                            : JSON.stringify(log.content)
                          }
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-right whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </AirlineLayout>
  );
}