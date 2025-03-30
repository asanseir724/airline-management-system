import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TourSetting } from "@shared/schema";
import { Loader2, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  avalaiApiKey: z.string().min(10, "کلید API باید حداقل 10 کاراکتر باشد"),
  telegramToken: z.string().min(1, "توکن تلگرام الزامی است"),
  telegramChannels: z.string().min(1, "کانال‌های تلگرام الزامی است"),
  timezone: z.string().default("Asia/Tehran"),
  intervalHours: z.number().min(1).max(48)
});

export default function TourSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<TourSetting>({
    queryKey: ["/api/tour-settings"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      avalaiApiKey: "",
      telegramToken: "",
      telegramChannels: "",
      timezone: "Asia/Tehran",
      intervalHours: 24
    },
  });

  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      form.reset({
        avalaiApiKey: settings.avalaiApiKey,
        telegramToken: settings.telegramToken,
        telegramChannels: settings.telegramChannels,
        timezone: settings.timezone,
        intervalHours: settings.intervalHours
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!settings) return null;
      const res = await apiRequest("PATCH", `/api/tour-settings/${settings.id}`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-settings"] });
      toast({
        title: "تنظیمات بروزرسانی شد",
        description: "تنظیمات سیستم تور با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "در بروزرسانی تنظیمات خطایی رخ داد",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <AirlineLayout 
        title="تنظیمات سیستم تور" 
        subtitle="تنظیمات مربوط به سیستم تور را تغییر دهید"
      >
        <div className="flex justify-center items-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AirlineLayout>
    );
  }

  return (
    <AirlineLayout 
      title="تنظیمات سیستم تور" 
      subtitle="تنظیمات مربوط به سیستم تور را تغییر دهید"
    >
      <div className="grid gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تنظیمات API</CardTitle>
                <CardDescription>
                  API های مورد نیاز برای استفاده از سیستم تور
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="avalaiApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>کلید API آوالای</FormLabel>
                      <FormControl>
                        <Input placeholder="کلید API آوالای" {...field} />
                      </FormControl>
                      <FormDescription>
                        کلید API آوالای برای دریافت اطلاعات تورها
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تنظیمات تلگرام</CardTitle>
                <CardDescription>
                  تنظیمات مربوط به ارسال پیام‌های تلگرامی
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="telegramToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>توکن ربات تلگرام</FormLabel>
                      <FormControl>
                        <Input placeholder="توکن ربات تلگرام" {...field} />
                      </FormControl>
                      <FormDescription>
                        توکن ربات تلگرام برای ارسال پیام‌ها
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telegramChannels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>کانال‌های تلگرام</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: @channel1,@channel2" {...field} />
                      </FormControl>
                      <FormDescription>
                        کانال‌های تلگرام برای ارسال پیام‌ها (با کاما جدا شوند)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تنظیمات زمان‌بندی</CardTitle>
                <CardDescription>
                  تنظیمات مربوط به زمان‌بندی ارسال پیام‌ها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>منطقه زمانی</FormLabel>
                      <FormControl>
                        <Input placeholder="منطقه زمانی" {...field} />
                      </FormControl>
                      <FormDescription>
                        منطقه زمانی برای محاسبه زمان (مثال: Asia/Tehran)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intervalHours"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>فاصله زمانی ارسال (ساعت)</FormLabel>
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <FormControl>
                          <Slider
                            defaultValue={[value]}
                            max={48}
                            min={1}
                            step={1}
                            onValueChange={(vals) => onChange(vals[0])}
                            {...fieldProps}
                          />
                        </FormControl>
                        <span className="w-12 text-center">{value}</span>
                      </div>
                      <FormDescription>
                        فاصله زمانی بین هر ارسال (به ساعت)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="mr-auto"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="ml-2 h-4 w-4" />
                  )}
                  ذخیره تنظیمات
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </AirlineLayout>
  );
}