import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// زمانی که فرم تنظیمات پیامک ارسال می‌شود، تبدیل به این ساختار می‌شود
const smsSettingsSchema = z.object({
  token: z.string().min(1, { message: "توکن نمی‌تواند خالی باشد" }),
  defaultLine: z.string().min(1, { message: "شماره خط پیش‌فرض نمی‌تواند خالی باشد" }),
  backupLine: z.string().min(1, { message: "شماره خط پشتیبان نمی‌تواند خالی باشد" }),
  username: z.string().optional(),
  password: z.string().optional(),
  enabled: z.boolean().default(true),
});

type SmsSettingsFormValues = z.infer<typeof smsSettingsSchema>;

interface SmsSettings {
  id: number;
  token: string;
  defaultLine: string;
  backupLine: string;
  username: string;
  password: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function SmsSettingsComponent() {
  const { toast } = useToast();

  const form = useForm<SmsSettingsFormValues>({
    resolver: zodResolver(smsSettingsSchema),
    defaultValues: {
      token: "",
      defaultLine: "980000000",
      backupLine: "980000000",
      username: "",
      password: "",
      enabled: true,
    },
  });

  const { data: settings, isLoading } = useQuery<SmsSettings>({
    queryKey: ["/api/sms/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sms/settings");
      return await res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        token: settings.token,
        defaultLine: settings.defaultLine,
        backupLine: settings.backupLine,
        username: settings.username,
        password: settings.password,
        enabled: settings.enabled,
      });
    }
  }, [settings, form]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SmsSettingsFormValues) => {
      const res = await apiRequest("POST", "/api/sms/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/settings"] });
      toast({
        title: "تنظیمات با موفقیت ذخیره شد",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error saving SMS settings:", error);
      toast({
        title: "خطا در ذخیره تنظیمات",
        description: "لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SmsSettingsFormValues) => {
    saveSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تنظیمات پیامک</CardTitle>
        <CardDescription>تنظیم پارامترهای ارسال پیامک با سرویس آموت‌اس‌ام‌اس</CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>توکن آموت‌اس‌ام‌اس</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="توکن معتبر را وارد کنید"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    توکن اختصاصی حساب شما در سرویس آموت‌اس‌ام‌اس
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="defaultLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره خط پیش‌فرض</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="980000000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      شماره خط پیش‌فرض برای ارسال پیامک
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backupLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره خط پشتیبان</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="980000000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      شماره خط پشتیبان برای مواقعی که خط اصلی دچار مشکل شود
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام کاربری (اختیاری)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="نام کاربری آموت‌اس‌ام‌اس"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز عبور (اختیاری)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="رمز عبور آموت‌اس‌ام‌اس"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">فعال‌سازی ارسال پیامک</FormLabel>
                    <FormDescription>
                      در صورت غیرفعال‌سازی، هیچ پیامکی ارسال نخواهد شد
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              disabled={saveSettingsMutation.isPending || !form.formState.isDirty}
              className="flex items-center gap-2"
            >
              {saveSettingsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  ذخیره تنظیمات
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}