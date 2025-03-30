import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRequestSchema } from "@shared/schema";

const requestFormSchema = insertRequestSchema.extend({
  customerName: z.string().min(3, "نام مشتری باید حداقل ۳ کاراکتر باشد"),
  phoneNumber: z.string().min(10, "شماره تلفن باید حداقل ۱۰ کاراکتر باشد"),
  ticketNumber: z.string().min(3, "شماره بلیط باید حداقل ۳ کاراکتر باشد"),
  requestType: z.enum(["refund", "payment"], {
    required_error: "لطفاً نوع درخواست را انتخاب کنید",
  }),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

export function RequestFormComponent() {
  const { toast } = useToast();
  
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      ticketNumber: "",
      description: "",
    },
  });
  
  const createRequest = useMutation({
    mutationFn: (values: RequestFormValues) => 
      apiRequest("POST", "/api/requests", values),
    onSuccess: async () => {
      toast({
        title: "✅ درخواست با موفقیت ثبت شد!",
        description: "به زودی بررسی می‌شود",
      });
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در ثبت درخواست",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: RequestFormValues) => {
    createRequest.mutate(values);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام و نام خانوادگی</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="نام و نام خانوادگی مشتری را وارد کنید"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره تماس</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="شماره تماس مشتری را وارد کنید"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ticketNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره بلیط</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="شماره بلیط را وارد کنید"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع درخواست</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="نوع درخواست را انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="refund">استرداد بلیط</SelectItem>
                        <SelectItem value="payment">واریز وجه</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormLabel>توضیحات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="توضیحات اضافی در مورد درخواست را وارد کنید"
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
                className="px-6"
                disabled={createRequest.isPending}
              >
                {createRequest.isPending ? "در حال ثبت..." : "ثبت درخواست"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
