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
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TourDestination } from "@shared/schema";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  name: z.string().min(2, "نام مقصد باید حداقل 2 کاراکتر باشد"),
  active: z.boolean().default(true)
});

export default function TourDestinations() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<TourDestination | null>(null);
  const { toast } = useToast();

  const { data: destinations = [], isLoading } = useQuery<TourDestination[]>({
    queryKey: ["/api/tour-destinations"],
  });

  const addForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      active: true,
    },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/tour-destinations", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-destinations"] });
      toast({
        title: "عملیات موفق",
        description: "مقصد گردشگری جدید با موفقیت ایجاد شد",
      });
      setIsAddOpen(false);
      addForm.reset();
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در ایجاد مقصد گردشگری رخ داد",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema> & { id: number }) => {
      const { id, ...data } = values;
      const res = await apiRequest("PATCH", `/api/tour-destinations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-destinations"] });
      toast({
        title: "عملیات موفق",
        description: "مقصد گردشگری با موفقیت بروزرسانی شد",
      });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در بروزرسانی مقصد گردشگری رخ داد",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/tour-destinations/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-destinations"] });
      toast({
        title: "عملیات موفق",
        description: "مقصد گردشگری با موفقیت حذف شد",
      });
      setIsDeleteOpen(false);
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "مشکلی در حذف مقصد گردشگری رخ داد",
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: z.infer<typeof formSchema>) => {
    if (selectedDestination) {
      updateMutation.mutate({ ...values, id: selectedDestination.id });
    }
  };

  const onDelete = () => {
    if (selectedDestination) {
      deleteMutation.mutate(selectedDestination.id);
    }
  };

  const handleEdit = (destination: TourDestination) => {
    setSelectedDestination(destination);
    editForm.reset({
      name: destination.name,
      active: destination.active,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (destination: TourDestination) => {
    setSelectedDestination(destination);
    setIsDeleteOpen(true);
  };

  return (
    <AirlineLayout 
      title="مدیریت مقاصد گردشگری" 
      subtitle="مقاصد گردشگری مختلف را اضافه، ویرایش و حذف کنید."
    >
      <div className="mb-4 flex justify-between items-center">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              افزودن مقصد جدید
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>افزودن مقصد گردشگری جدید</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام مقصد</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: کیش" {...field} />
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
          <TableCaption>لیست مقاصد گردشگری سیستم</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شناسه</TableHead>
              <TableHead className="text-right">نام مقصد</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {destinations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">هیچ مقصد گردشگری ثبت نشده است</TableCell>
              </TableRow>
            ) : (
              destinations.map((destination) => (
                <TableRow key={destination.id}>
                  <TableCell>{destination.id}</TableCell>
                  <TableCell>{destination.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${destination.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {destination.active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(destination)}
                      >
                        <Pencil className="h-4 w-4 ml-1" />
                        ویرایش
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(destination)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش مقصد گردشگری</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام مقصد</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
            <DialogTitle>حذف مقصد گردشگری</DialogTitle>
          </DialogHeader>
          <p>آیا از حذف مقصد "{selectedDestination?.name}" اطمینان دارید؟</p>
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