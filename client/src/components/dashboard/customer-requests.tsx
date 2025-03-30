import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Search, Filter } from "lucide-react";
import { CustomerRequest, SmsTemplate } from "@shared/schema";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Status badge component
function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">در انتظار بررسی</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-100 text-green-800">تایید شده</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-100 text-red-800">رد شده</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface CustomerRequestDetailProps {
  request: CustomerRequest;
  onClose: () => void;
}

// Customer Request Detail Dialog
function CustomerRequestDetail({ request, onClose }: CustomerRequestDetailProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState(request.status);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sendSms, setSendSms] = useState(true);

  // دریافت الگوهای پیامک
  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms/templates"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/customer-requests/${request.id}/status`, { 
        status: newStatus,
        sendSms: sendSms,
        smsTemplate: selectedTemplate || undefined
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "وضعیت با موفقیت بروزرسانی شد",
        description: "وضعیت درخواست مشتری با موفقیت تغییر کرد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-requests"] });
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

  const handleStatusChange = (value: string) => {
    setStatus(value);
  };

  const handleSaveStatus = () => {
    updateStatusMutation.mutate(status);
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>جزئیات درخواست استرداد</DialogTitle>
        <DialogDescription>
          درخواست شماره {request.id} در تاریخ {format(new Date(request.createdAt), "yyyy/MM/dd HH:mm")} ثبت شده است
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">نام صاحب حساب:</p>
          <p className="text-sm text-gray-700">{request.accountOwner}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">شماره تماس:</p>
          <p className="text-sm text-gray-700">{request.phoneNumber}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">ایمیل:</p>
          <p className="text-sm text-gray-700">{request.email || "ندارد"}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">سایت خرید:</p>
          <p className="text-sm text-gray-700">{request.website}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">شماره شبا:</p>
          <p className="text-sm text-gray-700 font-mono">{request.ibanNumber}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">شماره واچر:</p>
          <p className="text-sm text-gray-700 font-mono">{request.voucherNumber}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">کد پیگیری:</p>
          <p className="text-sm text-gray-700 font-mono">{request.trackingCode}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">علت استرداد:</p>
          <p className="text-sm text-gray-700">{request.refundReason}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">وضعیت:</p>
          <Select onValueChange={handleStatusChange} defaultValue={request.status}> {/* Added defaultValue */}
            <SelectTrigger className="w-full">
              <SelectValue placeholder="انتخاب وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">در انتظار بررسی</SelectItem>
              <SelectItem value="approved">تایید شده</SelectItem>
              <SelectItem value="rejected">رد شده</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 my-4">
        <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="smsTemplate" className="block text-sm font-medium">الگوی پیامک</Label>
            <Select onValueChange={setSelectedTemplate} defaultValue="">
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
      </div>

      <div className="col-span-2 space-y-2 mt-4">
        <p className="text-sm font-medium">توضیحات:</p>
        <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-md min-h-20">{request.description || "بدون توضیحات"}</p>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div>
          <Badge variant={request.contactedSupport ? "outline" : "destructive"} className={request.contactedSupport ? "bg-green-100 text-green-800" : ""}>
            {request.contactedSupport ? "تماس با پشتیبانی: بله" : "تماس با پشتیبانی: خیر"}
          </Badge>
        </div>
        <div className="space-x-2 space-x-reverse">
          <Button onClick={onClose} variant="outline">بستن</Button>
          <Button 
            onClick={handleSaveStatus} 
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// Main Customer Requests Component
export function CustomerRequestsComponent() {
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchBy, setSearchBy] = useState<"voucherNumber" | "trackingCode" | "phoneNumber">("voucherNumber");

  const { data, isLoading, isError } = useQuery<CustomerRequest[]>({
    queryKey: ["/api/customer-requests", searchTerm],
    queryFn: async () => {
      try {
        // اگر عبارت جستجو وجود داشته باشد، جستجو را با API انجام بده
        if (searchTerm && searchTerm.trim() !== "") {
          const response = await fetch(`/api/customer-requests?search=${encodeURIComponent(searchTerm)}`);
          
          // اگر پاسخ 401 بود، مشکل خطای احراز هویت است
          if (response.status === 401) {
            return []; // در صورت خطای احراز هویت، آرایه خالی برگردان
          }
          
          if (!response.ok) {
            console.error("خطا در جستجوی درخواست‌ها:", response.status);
            return [];
          }
          return await response.json();
        }
        
        // در غیر این صورت، همه درخواست‌ها را دریافت کن
        const response = await fetch("/api/customer-requests");
        
        // اگر پاسخ 401 بود، مشکل خطای احراز هویت است
        if (response.status === 401) {
          return []; // در صورت خطای احراز هویت، آرایه خالی برگردان
        }
        
        if (!response.ok) {
          console.error("خطا در دریافت درخواست‌ها:", response.status);
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error("خطا در ارتباط با سرور:", error);
        return [];
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const handleViewDetail = (request: CustomerRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseDetail = () => {
    setSelectedRequest(null);
  };
  
  // فیلتر کردن داده‌ها بر اساس جستجو و فیلترها
  const filteredData = data?.filter((request) => {
    // فیلتر وضعیت
    if (statusFilter !== "all" && request.status !== statusFilter) {
      return false;
    }
    
    // جستجو بر اساس نوع جستجو
    if (searchTerm && searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      if (searchBy === "voucherNumber") {
        return request.voucherNumber.toLowerCase().includes(term);
      } else if (searchBy === "trackingCode") {
        return request.trackingCode.toLowerCase().includes(term);
      } else if (searchBy === "phoneNumber") {
        return request.phoneNumber.toLowerCase().includes(term);
      }
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>درخواست‌های استرداد مشتریان</CardTitle>
          <CardDescription>
            لیست درخواست‌های استرداد ثبت شده توسط مشتریان
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>درخواست‌های استرداد مشتریان</CardTitle>
          <CardDescription>
            لیست درخواست‌های استرداد ثبت شده توسط مشتریان
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-red-500">خطا در دریافت اطلاعات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>درخواست‌های استرداد مشتریان</CardTitle>
        <CardDescription>
          لیست درخواست‌های استرداد ثبت شده توسط مشتریان
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* بخش جستجو و فیلتر */}
        <div className="mb-6 bg-gray-50 p-4 rounded-md">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm mb-2 block">جستجو بر اساس</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="جستجو..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={searchBy} onValueChange={(value: any) => setSearchBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="نوع جستجو" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voucherNumber">شماره واچر</SelectItem>
                    <SelectItem value="trackingCode">کد پیگیری</SelectItem>
                    <SelectItem value="phoneNumber">شماره موبایل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label className="text-sm mb-2 block">وضعیت</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="pending">در انتظار بررسی</SelectItem>
                  <SelectItem value="approved">تایید شده</SelectItem>
                  <SelectItem value="rejected">رد شده</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Table>
          <TableCaption>لیست درخواست‌های استرداد</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right">شناسه</TableHead>
              <TableHead className="text-right">مسافر</TableHead>
              <TableHead className="text-right">شماره تماس</TableHead>
              <TableHead className="text-right">شماره واچر</TableHead>
              <TableHead className="text-right">کد پیگیری</TableHead>
              <TableHead className="text-right">تاریخ ثبت</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData && filteredData.length > 0 ? (
              filteredData.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.id}</TableCell>
                  <TableCell>{request.accountOwner}</TableCell>
                  <TableCell>{request.phoneNumber}</TableCell>
                  <TableCell>{request.voucherNumber}</TableCell>
                  <TableCell>{request.trackingCode}</TableCell>
                  <TableCell>{format(new Date(request.createdAt), "yyyy/MM/dd")}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(request)}
                    >
                      <Eye className="h-4 w-4 ml-1" />
                      مشاهده
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  درخواستی ثبت نشده است
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={selectedRequest !== null} onOpenChange={() => setSelectedRequest(null)}>
          {selectedRequest && (
            <CustomerRequestDetail
              request={selectedRequest}
              onClose={handleCloseDetail}
            />
          )}
        </Dialog>
      </CardContent>
    </Card>
  );
}