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
import { SmsTemplate } from '@shared/schema';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// اسکیما برای فرم الگوی پیامک
const templateFormSchema = z.object({
  name: z.string().min(1, { message: 'نام الگو نمی‌تواند خالی باشد' }),
  content: z.string().min(1, { message: 'متن الگو نمی‌تواند خالی باشد' }).max(160, { message: 'متن الگو نمی‌تواند بیش از 160 کاراکتر باشد' }),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export function SmsTemplates() {
  const { toast } = useToast();
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

  // دریافت لیست الگوهای پیامک
  const { data: templates = [], isLoading } = useQuery<SmsTemplate[]>({
    queryKey: ['/api/sms/templates'],
    queryFn: async () => {
      const res = await fetch('/api/sms/templates');
      if (!res.ok) throw new Error('خطا در دریافت الگوهای پیامک');
      return res.json();
    }
  });

  // تعریف فرم
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      content: '',
    },
  });

  // استفاده از میوتیشن برای افزودن الگوی جدید
  const addTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await apiRequest('POST', '/api/sms/templates', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'الگوی جدید',
        description: 'الگوی پیامک با موفقیت اضافه شد',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms/templates'] });
      form.reset();
      setIsAddingTemplate(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // استفاده از میوتیشن برای ویرایش الگو
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData & { id: number }) => {
      const res = await apiRequest('PATCH', `/api/sms/templates/${data.id}`, {
        name: data.name,
        content: data.content,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'ویرایش الگو',
        description: 'الگوی پیامک با موفقیت ویرایش شد',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms/templates'] });
      form.reset();
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // استفاده از میوتیشن برای حذف الگو
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/sms/templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'حذف الگو',
        description: 'الگوی پیامک با موفقیت حذف شد',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms/templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // شروع ویرایش الگو
  const startEditTemplate = (template: SmsTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      content: template.content,
    });
  };

  // لغو افزودن/ویرایش الگو
  const cancelEdit = () => {
    setIsAddingTemplate(false);
    setEditingTemplate(null);
    form.reset();
  };

  // ارسال فرم
  const onSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      addTemplateMutation.mutate(data);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>الگوهای پیامک</CardTitle>
            <CardDescription>مدیریت الگوهای پیامک</CardDescription>
          </div>
          {!isAddingTemplate && !editingTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingTemplate(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              الگوی جدید
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* فرم افزودن/ویرایش الگو */}
        {(isAddingTemplate || editingTemplate) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">
                  {editingTemplate ? 'ویرایش الگو' : 'الگوی جدید'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* نام الگو */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام الگو</FormLabel>
                    <FormControl>
                      <Input placeholder="نام الگو..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* متن الگو */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>متن الگو</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="متن الگو را وارد کنید..."
                        className="min-h-[100px]"
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

              {/* دکمه ذخیره */}
              <Button
                type="submit"
                className="w-full"
                disabled={addTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {(addTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال ذخیره...
                  </>
                ) : (
                  <>ذخیره الگو</>
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* لیست الگوهای پیامک */}
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            هیچ الگویی وجود ندارد
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {templates.map((template) => (
              <AccordionItem key={template.id} value={template.id.toString()}>
                <AccordionTrigger className="text-sm font-medium">
                  {template.name}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                    {template.content}
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditTemplate(template)}
                      disabled={editingTemplate !== null || isAddingTemplate}
                    >
                      <Pencil className="h-3.5 w-3.5 ml-1" />
                      ویرایش
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteTemplateMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 ml-1" />
                          حذف
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف الگوی پیامک</AlertDialogTitle>
                          <AlertDialogDescription>
                            آیا از حذف الگوی "{template.name}" اطمینان دارید؟ این عملیات قابل بازگشت نیست.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>انصراف</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteTemplateMutation.isPending ? (
                              <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                در حال حذف...
                              </>
                            ) : (
                              <>حذف</>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}