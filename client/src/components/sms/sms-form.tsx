import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SmsTemplate } from '@shared/schema';

const smsFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'شماره موبایل باید حداقل 10 رقم باشد' }),
  content: z.string().min(1, { message: 'متن پیامک نمی‌تواند خالی باشد' }).max(160, { message: 'متن پیامک نمی‌تواند بیش از 160 کاراکتر باشد' }),
  requestId: z.number().nullable().optional(),
});

type SmsFormData = z.infer<typeof smsFormSchema>;

export function SmsForm() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // دریافت لیست الگوهای پیامک
  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ['/api/sms/templates'],
    queryFn: async () => {
      const res = await fetch('/api/sms/templates');
      if (!res.ok) throw new Error('خطا در دریافت الگوهای پیامک');
      return res.json();
    }
  });

  // تعریف فرم
  const form = useForm<SmsFormData>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: {
      phoneNumber: '',
      content: '',
      requestId: null,
    },
  });

  // استفاده از میوتیشن برای ارسال پیامک
  const sendSmsMutation = useMutation({
    mutationFn: async (data: SmsFormData) => {
      const res = await apiRequest('POST', '/api/sms/send', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'ارسال موفق',
        description: 'پیامک با موفقیت ارسال شد',
        variant: 'default',
      });
      form.reset();
      // بروزرسانی تاریخچه ارسال پیامک
      queryClient.invalidateQueries({ queryKey: ['/api/sms/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در ارسال پیامک',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // انتخاب الگوی پیامک
  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    const selectedTemplateObj = templates.find(t => t.id.toString() === value);
    if (selectedTemplateObj) {
      form.setValue('content', selectedTemplateObj.content);
    }
  };

  // ارسال فرم
  const onSubmit = (data: SmsFormData) => {
    sendSmsMutation.mutate(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>ارسال پیامک</CardTitle>
        <CardDescription>ارسال پیامک به مشتریان و درخواست‌دهندگان</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* انتخاب الگوی پیامک */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">الگوی پیامک</label>
              <Select onValueChange={handleTemplateChange} value={selectedTemplate || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب الگوی پیامک..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* شماره موبایل */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>شماره موبایل</FormLabel>
                  <FormControl>
                    <Input 
                      dir="ltr" 
                      placeholder="09123456789" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* متن پیامک */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>متن پیامک</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="متن پیامک را وارد کنید..." 
                      className="min-h-[120px]" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-gray-500 mt-1">
                    {field.value.length}/160 کاراکتر
                  </div>
                </FormItem>
              )}
            />

            {/* دکمه ارسال */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={sendSmsMutation.isPending}
            >
              {sendSmsMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                <>ارسال پیامک</>
              )}
            </Button>

            {/* نمایش نتیجه ارسال */}
            {sendSmsMutation.isSuccess && (
              <div className="flex items-center p-3 bg-green-50 text-green-700 rounded-md mt-4">
                <CheckCircle className="h-5 w-5 ml-2" />
                <span>پیامک با موفقیت ارسال شد</span>
              </div>
            )}

            {sendSmsMutation.isError && (
              <div className="flex items-center p-3 bg-red-50 text-red-700 rounded-md mt-4">
                <AlertCircle className="h-5 w-5 ml-2" />
                <span>{sendSmsMutation.error.message || 'خطا در ارسال پیامک'}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}