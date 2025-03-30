import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SmsTemplate } from "@shared/schema";

const smsFormSchema = z.object({
  phoneNumber: z.string().min(10, "شماره تلفن باید حداقل ۱۰ کاراکتر باشد"),
  templateId: z.string().optional(),
  content: z.string().min(5, "متن پیامک باید حداقل ۵ کاراکتر باشد"),
});

type SmsFormValues = z.infer<typeof smsFormSchema>;

export function SmsForm() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms-templates"],
  });

  const form = useForm<SmsFormValues>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: {
      phoneNumber: "",
      content: "",
    },
  });
  
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id.toString() === selectedTemplate);
      if (template) {
        form.setValue("content", template.content);
      }
    }
  }, [selectedTemplate, templates, form]);

  const sendSms = useMutation({
    mutationFn: (values: SmsFormValues) => 
      apiRequest("POST", "/api/send-sms", {
        phoneNumber: values.phoneNumber,
        content: values.content,
        status: "sent"
      }),
    onSuccess: () => {
      toast({
        title: "پیامک با موفقیت ارسال شد ✅",
        description: "پیامک شما با موفقیت به مشتری ارسال شد",
      });
      form.reset();
      setSelectedTemplate("");
    },
    onError: (error) => {
      toast({
        title: "خطا در ارسال پیامک",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SmsFormValues) => {
    sendSms.mutate(values);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>ارسال پیامک</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>شماره تلفن مشتری</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="شماره تلفن را وارد کنید"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>انتخاب الگوی پیامک</FormLabel>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="الگوی پیامک را انتخاب کنید" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">الگوی پیامک را انتخاب کنید</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">پیام سفارشی</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>متن پیامک</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="متن پیامک را وارد کنید"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={sendSms.isPending}
              >
                {sendSms.isPending ? "در حال ارسال..." : "ارسال پیامک"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
