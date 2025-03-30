import React, { useState } from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TourBrand } from "@shared/schema";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  name: z.string().min(2, "نام برند باید حداقل 2 کاراکتر باشد"),
  type: z.string().min(2, "نوع برند باید حداقل 2 کاراکتر باشد"),
  telegramChannel: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true)
});

export default function TourBrands() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<TourBrand | null>(null);
  const { toast } = useToast();

  const { data: brands = [], isLoading } = useQuery<TourBrand[]>({
    queryKey: ["/api/tour-brands"],
  });

  const addForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      telegramChannel: "",
      description: "",
      active: true,
    },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      telegramChannel: "",
      description: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/tour-brands", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-brands"] });
      toast({
        title: "عملیات موفق",
        description: "برند تور جدید با موفقیت ایجاد شد",
      });
      setIsAddOpen(false);
      addForm.reset();
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در ایجاد برند تور رخ داد",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema> & { id: number }) => {
      const { id, ...data } = values;
      const res = await apiRequest("PATCH", `/api/tour-brands/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-brands"] });
      toast({
        title: "عملیات موفق",
        description: "برند تور با موفقیت بروزرسانی شد",
      });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در بروزرسانی برند تور رخ داد",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/tour-brands/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-brands"] });
      toast({
        title: "عملیات موفق",
        description: "برند تور با موفقیت حذف شد",
      });
      setIsDeleteOpen(false);
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در حذف برند تور رخ داد",
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: z.infer<typeof formSchema>) => {
    if (selectedBrand) {
      updateMutation.mutate({ ...values, id: selectedBrand.id });
    }
  };

  const onDelete = () => {
    if (selectedBrand) {
      deleteMutation.mutate(selectedBrand.id);
    }
  };

  const handleEdit = (brand: TourBrand) => {
    setSelectedBrand(brand);
    editForm.reset({
      name: brand.name,
      type: brand.type,
      telegramChannel: brand.telegramChannel || "",
      description: brand.description || "",
      active: brand.active,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (brand: TourBrand) => {
    setSelectedBrand(brand);
    setIsDeleteOpen(true);
  };

  return (
    <AirlineLayout 
      title="مدیریت برندهای تور" 
      subtitle="برندهای تور را اضافه، ویرایش و حذف کنید"
    >
      <div className="mb-4 flex justify-between items-center">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              افزودن برند جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>افزودن برند تور جدید</DialogTitle>
              <DialogDescription>
                اطلاعات برند تور جدید را وارد کنید.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام برند</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: علی‌بابا" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع برند</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: داخلی" {...field} />
                      </FormControl>
                      <FormDescription>
                        نوع برند می‌تواند داخلی، خارجی یا هر نوع دیگری باشد
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="telegramChannel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>کانال تلگرام</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: @channel_name" {...field} />
                      </FormControl>
                      <FormDescription>
                        آدرس کانال تلگرام برند (اختیاری)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>توضیحات</FormLabel>
                      <FormControl>
                        <Textarea placeholder="توضیحات برند..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>فعال</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    ذخیره
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableCaption>لیست برندهای تور در سیستم</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شناسه</TableHead>
              <TableHead className="text-right">نام برند</TableHead>
              <TableHead className="text-right">نوع</TableHead>
              <TableHead className="text-right">کانال تلگرام</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">هیچ برند توری ثبت نشده است</TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>{brand.id}</TableCell>
                  <TableCell>{brand.name}</TableCell>
                  <TableCell>{brand.type}</TableCell>
                  <TableCell>{brand.telegramChannel || "- - -"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${brand.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {brand.active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(brand)}
                      >
                        <Pencil className="h-4 w-4 ml-1" />
                        ویرایش
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(brand)}
                      >
                        <Trash2 className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش برند تور</DialogTitle>
            <DialogDescription>
              اطلاعات برند تور را ویرایش کنید.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام برند</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع برند</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="telegramChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>کانال تلگرام</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>توضیحات</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>فعال</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  بروزرسانی
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف برند تور</DialogTitle>
          </DialogHeader>
          <p>آیا از حذف برند "{selectedBrand?.name}" اطمینان دارید؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              انصراف
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AirlineLayout>
  );
}