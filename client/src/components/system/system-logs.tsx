import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, RefreshCw, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type LogLevel = "error" | "warn" | "info" | "debug";

interface SystemLog {
  id: number;
  level: LogLevel;
  message: string;
  module: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

export function SystemLogsComponent() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { toast } = useToast();

  const {
    data: logs = [],
    isLoading,
    refetch
  } = useQuery<SystemLog[]>({
    queryKey: ["/api/system-logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/system-logs");
      return await res.json();
    }
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/system-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-logs"] });
      toast({
        title: "لاگ با موفقیت حذف شد",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error deleting log:", error);
      toast({
        title: "خطا در حذف لاگ",
        description: "لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  });

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/system-logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-logs"] });
      toast({
        title: "تمام لاگ‌ها با موفقیت حذف شدند",
        variant: "default",
      });
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      console.error("Error clearing logs:", error);
      toast({
        title: "خطا در حذف لاگ‌ها",
        description: "لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = search === "" || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      (log.module && log.module.toLowerCase().includes(search.toLowerCase()));
    
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    
    return matchesSearch && matchesLevel;
  });

  const getLevelBadgeVariant = (level: LogLevel) => {
    switch (level) {
      case "error": return "destructive";
      case "warn": return "warning";
      case "info": return "info";
      case "debug": return "outline";
      default: return "default";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>لاگ‌های سیستم</CardTitle>
            <CardDescription>مشاهده و مدیریت لاگ‌های سیستم</CardDescription>
          </div>
          <div className="space-x-2 flex">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              title="به‌روزرسانی"
            >
              <RefreshCw className="h-4 w-4 ml-1" />
              بازنشانی
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setIsDeleteModalOpen(true)}
              title="پاک کردن همه"
            >
              <Trash2 className="h-4 w-4 ml-1" />
              حذف همه
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative w-full sm:w-1/2">
            <Input
              placeholder="جستجو در پیام‌ها و ماژول‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
            {search && (
              <Button
                variant="ghost"
                className="absolute top-0 left-0 h-full p-2"
                onClick={() => setSearch("")}
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-1/2">
            <Filter className="h-4 w-4" />
            <Select
              value={levelFilter}
              onValueChange={(val) => setLevelFilter(val as LogLevel | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فیلتر بر اساس سطح" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه سطوح</SelectItem>
                <SelectItem value="error">خطا</SelectItem>
                <SelectItem value="warn">هشدار</SelectItem>
                <SelectItem value="info">اطلاعات</SelectItem>
                <SelectItem value="debug">دیباگ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            هیچ لاگی یافت نشد
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>سطح</TableHead>
                  <TableHead>زمان</TableHead>
                  <TableHead>ماژول</TableHead>
                  <TableHead className="w-full">پیام</TableHead>
                  <TableHead>جزئیات</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getLevelBadgeVariant(log.level) as any}>
                        {log.level === "error" ? "خطا" : 
                         log.level === "warn" ? "هشدار" : 
                         log.level === "info" ? "اطلاعات" : 
                         "دیباگ"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(log.createdAt), "yyyy/MM/dd HH:mm:ss")}</TableCell>
                    <TableCell>{log.module || "-"}</TableCell>
                    <TableCell className="max-w-md truncate">{log.message}</TableCell>
                    <TableCell>
                      {log.details ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          title="نمایش جزئیات"
                          onClick={() => {
                            toast({
                              title: "جزئیات لاگ",
                              description: (
                                <pre className="mt-2 w-full max-h-80 overflow-auto p-2 rounded bg-secondary">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ),
                              variant: "default",
                            });
                          }}
                        >
                          نمایش
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="حذف"
                        onClick={() => deleteLogMutation.mutate(log.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Alert Dialog for Clear All Confirmation */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف تمام لاگ‌ها</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف تمام لاگ‌های سیستم اطمینان دارید؟ این عمل غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                clearAllLogsMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearAllLogsMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-4"></div>
              ) : (
                "حذف تمام لاگ‌ها"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}