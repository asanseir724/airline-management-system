import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AirlineLogo } from "@/components/icons/airline-logo";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Schema for the request form
const requestFormSchema = z.object({
  email: z.string().email("ایمیل نامعتبر است").optional().or(z.literal("")),
  website: z.string().min(1, "لطفاً سایت خرید را انتخاب کنید"),
  refundReason: z.string().min(1, "لطفاً علت استرداد را انتخاب کنید"),
  voucherNumber: z.string().min(1, "شماره واچر الزامی است"),
  phoneNumber: z.string().min(10, "شماره تلفن همراه نامعتبر است").max(11, "شماره تلفن همراه نامعتبر است"),
  ibanNumber: z.string().min(24, "شماره شبا باید 24 رقم باشد").max(24, "شماره شبا باید 24 رقم باشد"),
  accountOwner: z.string().min(3, "نام صاحب حساب الزامی است"),
  description: z.string().optional(),
  contactedSupport: z.boolean().refine(val => val === true, {
    message: "تماس با پشتیبانی الزامی است",
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "پذیرش شرایط و قوانین الزامی است",
  }),
  // In a real application, we would handle file uploads too
  // ticketFile: z.instanceof(File).optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

export default function CustomerRequestForm() {
  const { toast } = useToast();
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [vouicherError, setVoucherError] = useState<string | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      email: "",
      website: "",
      refundReason: "",
      voucherNumber: "",
      phoneNumber: "",
      ibanNumber: "",
      accountOwner: "",
      description: "",
      contactedSupport: false,
      acceptTerms: false,
    },
  });

  // بررسی تکراری بودن شماره واچر
  const checkVoucherNumber = async (voucherNumber: string) => {
    try {
      setCheckingVoucher(true);
      setVoucherError(null);
      const response = await fetch(`/api/check-voucher/${voucherNumber}`);
      const data = await response.json();
      
      if (response.status === 409 || data.exists) {
        setVoucherError("این شماره واچر قبلاً ثبت شده است");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking voucher:", error);
      return true; // در صورت خطا، اجازه می‌دهیم کاربر ادامه دهد
    } finally {
      setCheckingVoucher(false);
    }
  };

  // بررسی شماره واچر هنگام تغییر
  useEffect(() => {
    const voucherNumber = form.watch("voucherNumber");
    const debounceTimeout = setTimeout(() => {
      if (voucherNumber && voucherNumber.length > 3) {
        checkVoucherNumber(voucherNumber);
      }
    }, 500);
    
    return () => clearTimeout(debounceTimeout);
  }, [form.watch("voucherNumber")]);

  const submitRequest = useMutation({
    mutationFn: async (values: RequestFormValues) => {
      // بررسی مجدد قبل از ارسال
      const isValid = await checkVoucherNumber(values.voucherNumber);
      if (!isValid) {
        throw new Error("این شماره واچر قبلاً ثبت شده است");
      }
      
      const response = await apiRequest("POST", "/api/customer-requests", values);
      const data = await response.json();
      if (data.trackingCode) {
        setTrackingCode(data.trackingCode);
      } else {
        setTrackingCode(Math.floor(Math.random() * 10000000 + 10000000).toString());
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "درخواست با موفقیت ثبت شد",
        description: "درخواست شما با موفقیت در سیستم ثبت شد و در اسرع وقت بررسی خواهد شد",
      });
      form.reset();
      setIsSubmitSuccess(true);
    },
    onError: (error) => {
      toast({
        title: "خطا در ثبت درخواست",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormValues) => {
    if (vouicherError) {
      toast({
        title: "خطای اعتبارسنجی",
        description: vouicherError,
        variant: "destructive",
      });
      return;
    }
    submitRequest.mutate(data);
  };

  // For file upload
  const [fileName, setFileName] = useState<string>("");
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  if (isSubmitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl bg-white">
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">درخواست شما با موفقیت ثبت شد</h1>
              <p className="text-gray-600 mb-6">
                درخواست شما در سیستم ثبت شد و کارشناسان ما در اسرع وقت آن را بررسی خواهند کرد.
              </p>
              <p className="text-gray-600 mb-6">
                در صورت نیاز به پیگیری، شماره پیگیری خود را یادداشت کنید:
                <span className="font-bold block mt-2 text-lg">
                  {trackingCode}
                </span>
              </p>
              <Button onClick={() => setIsSubmitSuccess(false)}>
                ثبت درخواست جدید
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <AirlineLogo className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">فرم درخواست استرداد بلیط</CardTitle>
          <p className="text-gray-600 mt-2">لطفاً تمامی اطلاعات خواسته شده را با دقت وارد نمایید</p>
        </CardHeader>
        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ایمیل (اختیاری)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ایمیل خود را وارد کنید" 
                          type="email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>از چه سایتی خرید کرده‌اید؟ *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="لطفا انتخاب کنید" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="مسترچارتر">مسترچارتر</SelectItem>
                          <SelectItem value="الیت چارتر">الیت چارتر</SelectItem>
                          <SelectItem value="اسکایرو">اسکایرو</SelectItem>
                          <SelectItem value="بلیط یاب">بلیط یاب</SelectItem>
                          <SelectItem value="سفرفوری">سفرفوری</SelectItem>
                          <SelectItem value="فراسیر">فراسیر</SelectItem>
                          <SelectItem value="آسان سیر">آسان سیر</SelectItem>
                          <SelectItem value="خرید تلفنی">خرید تلفنی</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="refundReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>علت استرداد *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="لطفا انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="کنسلی پرواز توسط ایرلاین">کنسلی پرواز توسط ایرلاین</SelectItem>
                        <SelectItem value="خرید ناموفق">خرید ناموفق</SelectItem>
                        <SelectItem value="کنسلی به درخواست مسافر">کنسلی به درخواست مسافر</SelectItem>
                        <SelectItem value="تاخیر بیش از دوساعت">تاخیر بیش از دوساعت</SelectItem>
                        <SelectItem value="بدی آب و هوا">بدی آب و هوا</SelectItem>
                        <SelectItem value="جا ماندن از پرواز">جا ماندن از پرواز</SelectItem>
                        <SelectItem value="تعجیل پرواز">تعجیل پرواز</SelectItem>
                        <SelectItem value="سایر">سایر</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="voucherNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شماره واچر *</FormLabel>
                      <FormControl>
                        <Input placeholder="شماره واچر پرواز را وارد کنید" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        شماره واچر پرواز در پیامکی که از طرف سایت برای شما هنگام خرید ارسال شده است موجود می‌باشد.
                      </FormDescription>
                      {vouicherError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle className="text-xs font-medium">خطا</AlertTitle>
                          <AlertDescription className="text-xs">
                            {vouicherError}
                          </AlertDescription>
                        </Alert>
                      )}
                      {checkingVoucher && (
                        <p className="text-xs text-muted-foreground mt-1">
                          در حال بررسی شماره واچر...
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تلفن همراه ثبت شده در سیستم *</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="شماره موبایل" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ibanNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شماره شبا *</FormLabel>
                      <FormControl>
                        <Input placeholder="شماره شبا (بدون IR)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        بدون IR وارد کنید
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountOwner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام صاحب حساب (فقط به نام مسافر) *</FormLabel>
                      <FormControl>
                        <Input placeholder="نام و نام خانوادگی صاحب حساب" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs text-red-500">
                        شماره حساب حتما باید به نام مسافر باشد و در صورت مغایرت درخواست باطل می‌گردد
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>توضیحات (اختیاری)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="در صورت نیاز توضیحات خود را وارد کنید" 
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactedSupport"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>آیا با پشتیبانی تماس حاصل کرده‌اید؟ *</FormLabel>
                        <FormDescription className="text-xs">
                          با پشتیبانی تماس گرفته‌ام و تمامی شرایط و قوانین استرداد را می‌پذیرم.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>تایید قوانین کنسلی *</FormLabel>
                        <FormDescription className="text-xs text-red-500">
                          با ثبت این درخواست بلیط شما کنسل نمی‌گردد. برای تایید کنسلی حتما با پشتیبانی تماس گرفته و تایید کنسلی را از آنها دریافت کنید. در صورت عدم تماس با پشتیبانی تمامی خسارت‌های وارده به عهده مسافر می‌باشد.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-md p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ارسال فایل بلیط (اختیاری)
                </label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <label
                    htmlFor="ticket-file"
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="ml-2 h-4 w-4" />
                    انتخاب فایل
                  </label>
                  <span className="text-sm text-gray-500">
                    {fileName || "فایلی انتخاب نشده"}
                  </span>
                </div>
                <input
                  id="ticket-file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="mt-2 text-xs text-gray-500">
                  چنانچه بلیط مهر شده توسط مسئولین فرودگاه در اختیار دارید آن را ضمیمه کنید.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitRequest.isPending}
              >
                {submitRequest.isPending ? "در حال ثبت درخواست..." : "ثبت درخواست"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}