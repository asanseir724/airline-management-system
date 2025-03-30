import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SmsTemplate, insertSmsTemplateSchema } from "@shared/schema";
import { PlusCircle, Edit, Trash } from "lucide-react";

const templateFormSchema = insertSmsTemplateSchema.extend({
  name: z.string().min(3, "نام الگو باید حداقل ۳ کاراکتر باشد"),
  content: z.string().min(5, "متن الگو باید حداقل ۵ کاراکتر باشد"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export function SmsTemplates() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  
  const { data: templates = [], isLoading } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms-templates"],
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      content: "",
    },
  });
  
  const createTemplate = useMutation({
    mutationFn: (values: TemplateFormValues) => 
      apiRequest("POST", "/api/sms-templates", values),
    onSuccess: async () => {
      toast({
        title: "الگو با موفقیت ایجاد شد",
        description: "الگوی پیامک جدید با موفقیت ایجاد شد",
      });
      form.reset();
      setIsAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در ایجاد الگو",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateTemplate = useMutation({
    mutationFn: (values: TemplateFormValues) => 
      apiRequest("PATCH", `/api/sms-templates/${selectedTemplate?.id}`, values),
    onSuccess: async () => {
      toast({
        title: "الگو با موفقیت بروزرسانی شد",
        description: "الگوی پیامک با موفقیت بروزرسانی شد",
      });
      form.reset();
      setIsEditOpen(false);
      setSelectedTemplate(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در بروزرسانی الگو",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteTemplate = useMutation({
    mutationFn: () => 
      apiRequest("DELETE", `/api/sms-templates/${selectedTemplate?.id}`),
    onSuccess: async () => {
      toast({
        title: "الگو با موفقیت حذف شد",
        description: "الگوی پیامک با موفقیت حذف شد",
      });
      setIsDeleteOpen(false);
      setSelectedTemplate(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
    },
    onError: (error) => {
      toast({
        title: "خطا در حذف الگو",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTemplate = () => {
    form.reset();
    setIsAddOpen(true);
  };

  const handleEditTemplate = (template: SmsTemplate) => {
    form.reset();
    form.setValue("name", template.name);
    form.setValue("content", template.content);
    setSelectedTemplate(template);
    setIsEditOpen(true);
  };

  const handleDeleteTemplate = (template: SmsTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteOpen(true);
  };
  
  const onAddSubmit = (values: TemplateFormValues) => {
    createTemplate.mutate(values);
  };
  
  const onEditSubmit = (values: TemplateFormValues) => {
    updateTemplate.mutate(values);
  };
  
  const onDeleteConfirm = () => {
    deleteTemplate.mutate();
  };

  const selectSmsTemplate = (template: SmsTemplate) => {
    // This function would set the template text in the parent component
    // We'll implement this through props in a real implementation
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>الگوهای پیامک</CardTitle>
          <Button size="icon" variant="ghost" onClick={handleAddTemplate}>
            <PlusCircle className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">در حال بارگذاری...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4">هیچ الگویی یافت نشد</div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-md p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectSmsTemplate(template)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <div className="flex space-x-1 space-x-reverse">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {template.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Template Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن الگوی جدید</DialogTitle>
            <DialogDescription>
              یک الگوی پیامک جدید ایجاد کنید.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام الگو</FormLabel>
                    <FormControl>
                      <Input placeholder="نام الگو" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>متن الگو</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="متن الگو"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  انصراف
                </Button>
                <Button type="submit" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? "در حال ثبت..." : "افزودن"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش الگو</DialogTitle>
            <DialogDescription>
              الگوی پیامک را ویرایش کنید.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام الگو</FormLabel>
                    <FormControl>
                      <Input placeholder="نام الگو" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>متن الگو</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="متن الگو"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  انصراف
                </Button>
                <Button type="submit" disabled={updateTemplate.isPending}>
                  {updateTemplate.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الگو</DialogTitle>
            <DialogDescription>
              آیا از حذف این الگو اطمینان دارید؟ این عمل غیرقابل بازگشت است.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              انصراف
            </Button>
            <Button 
              variant="destructive"
              onClick={onDeleteConfirm}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "در حال حذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
