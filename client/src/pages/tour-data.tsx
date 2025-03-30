import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AirlineLayout } from "@/components/airline-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Eye, Trash2, Send, CheckCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPersianDate } from "@/lib/formatters";
import { TourData, TourDestination, TourBrand } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function TourDataPage() {
  const { toast } = useToast();
  const [selectedTour, setSelectedTour] = useState<TourData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Get tour data
  const { data: tourData = [], isLoading, isError, refetch } = useQuery<TourData[]>({
    queryKey: ["/api/tour-data"],
    staleTime: 1000 * 60, // 1 minute
  });

  // Get destinations for mapping
  const { data: destinations = [] } = useQuery<TourDestination[]>({
    queryKey: ["/api/tour-destinations"],
  });
  
  // Get brands for mapping
  const { data: brands = [] } = useQuery<TourBrand[]>({
    queryKey: ["/api/tour-brands"],
  });

  // Delete tour data mutation
  const deleteTourMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/tour-data/${id}`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در حذف اطلاعات تور");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      toast({
        title: "حذف اطلاعات",
        description: "اطلاعات تور با موفقیت حذف شد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Publish tour mutation
  const publishTourMutation = useMutation({
    mutationFn: async (data: { id: number; isPublished: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tour-data/${data.id}`, { isPublished: data.isPublished });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در تغییر وضعیت انتشار");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      toast({
        title: "تغییر وضعیت",
        description: "وضعیت انتشار تور با موفقیت تغییر کرد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send to telegram mutation
  const sendToTelegramMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/tour-data/${id}/send-telegram`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در ارسال به تلگرام");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tour-history"] });
      toast({
        title: "ارسال به تلگرام",
        description: "اطلاعات تور با موفقیت به کانال تلگرام ارسال شد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // اسکرپ مستقیم از skyrotrip
  const [skyroUrl, setSkyroUrl] = useState("");
  const [skyroSourceId, setSkyroSourceId] = useState<number | undefined>(undefined);
  const [skyroDestinationId, setSkyroDestinationId] = useState<number | undefined>(undefined);
  const [isSkyroDialogOpen, setIsSkyroDialogOpen] = useState(false);
  
  const skyroScrapeMutation = useMutation({
    mutationFn: async () => {
      if (!skyroUrl || !skyroSourceId) {
        throw new Error("آدرس تور و منبع انتخاب نشده است");
      }
      
      const res = await apiRequest("POST", `/api/tour-data/skyro-scrape`, {
        url: skyroUrl,
        sourceId: skyroSourceId,
        destinationId: skyroDestinationId
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در استخراج اطلاعات تور از skyrotrip");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      toast({
        title: "استخراج اطلاعات تور",
        description: "اطلاعات تور با موفقیت از skyrotrip استخراج شد",
      });
      setIsSkyroDialogOpen(false);
      setSkyroUrl("");
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // بروزرسانی تور موجود از skyrotrip
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateTourId, setUpdateTourId] = useState<number | undefined>(undefined);
  const [updateTourUrl, setUpdateTourUrl] = useState("");
  
  const skyroUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!updateTourId || !updateTourUrl) {
        throw new Error("آیدی تور یا آدرس آن انتخاب نشده است");
      }
      
      const res = await apiRequest("POST", `/api/tour-data/${updateTourId}/skyro-update`, {
        url: updateTourUrl
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در بروزرسانی اطلاعات تور از skyrotrip");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      toast({
        title: "بروزرسانی اطلاعات تور",
        description: "اطلاعات تور با موفقیت از skyrotrip بروزرسانی شد",
      });
      setIsUpdateDialogOpen(false);
      setUpdateTourUrl("");
      setUpdateTourId(undefined);
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (tour: TourData) => {
    setSelectedTour(tour);
    setIsDetailsOpen(true);
  };

  const handleDeleteTour = (id: number) => {
    deleteTourMutation.mutate(id);
  };

  const handleTogglePublish = (id: number, currentStatus: boolean) => {
    publishTourMutation.mutate({ id, isPublished: !currentStatus });
  };

  const handleSendToTelegram = (id: number) => {
    sendToTelegramMutation.mutate(id);
  };

  // We can remove this function and use the imported formatPersianDate instead

  const getDestinationName = (id: number | null) => {
    if (!id) return "نامشخص";
    const destination = destinations.find(d => d.id === id);
    return destination ? destination.name : "نامشخص";
  };

  const getBrandName = (id: number | null) => {
    if (!id) return "نامشخص";
    const brand = brands.find(b => b.id === id);
    return brand ? brand.name : "نامشخص";
  };

  const filteredData = tourData.filter(tour => {
    // Filter by published status
    if (filter === "published" && !tour.isPublished) return false;
    if (filter === "unpublished" && tour.isPublished) return false;
    
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        tour.title.toLowerCase().includes(searchLower) ||
        (tour.description && tour.description.toLowerCase().includes(searchLower)) ||
        (tour.price && tour.price.toLowerCase().includes(searchLower)) ||
        getDestinationName(tour.destinationId).toLowerCase().includes(searchLower) ||
        getBrandName(tour.brandId).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  return (
    <AirlineLayout 
      title="داده‌های استخراج شده تور" 
      subtitle="مدیریت داده‌های استخراج شده از منابع"
    >
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`ml-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </Button>
            
            <Button 
              variant="default"
              onClick={() => setIsSkyroDialogOpen(true)}
            >
              استخراج از SkyroTrip
            </Button>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="فیلتر وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="published">منتشر شده</SelectItem>
                <SelectItem value="unpublished">منتشر نشده</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-64">
            <Input 
              placeholder="جستجو..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded-md">
          <p className="text-sm text-gray-600">
            تعداد کل: {tourData.length} | 
            منتشر شده: {tourData.filter(t => t.isPublished).length} | 
            فیلتر شده: {filteredData.length}
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 text-red-800 rounded-md">
          خطا در دریافت اطلاعات
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>داده‌های استخراج شده از منابع تور</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">عنوان</TableHead>
                <TableHead className="text-right">مقصد</TableHead>
                <TableHead className="text-right">برند</TableHead>
                <TableHead className="text-right">قیمت</TableHead>
                <TableHead className="text-right">تاریخ استخراج</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    داده‌ای یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((tour) => (
                  <TableRow key={tour.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {tour.title}
                    </TableCell>
                    <TableCell>{getDestinationName(tour.destinationId)}</TableCell>
                    <TableCell>{getBrandName(tour.brandId)}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {tour.price || "نامشخص"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {formatPersianDate(tour.scrapedAt)}
                    </TableCell>
                    <TableCell>
                      {tour.isPublished ? (
                        <Badge variant="success">منتشر شده</Badge>
                      ) : (
                        <Badge variant="outline">منتشر نشده</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 space-x-reverse">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetails(tour)}
                        >
                          <Eye className="h-4 w-4 ml-1" />
                          جزئیات
                        </Button>
                        
                        <Button
                          variant={tour.isPublished ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleTogglePublish(tour.id, tour.isPublished)}
                          disabled={publishTourMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 ml-1" />
                          {tour.isPublished ? "عدم انتشار" : "انتشار"}
                        </Button>
                        
                        {tour.isPublished && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendToTelegram(tour.id)}
                            disabled={sendToTelegramMutation.isPending}
                          >
                            <Send className="h-4 w-4 ml-1" />
                            ارسال
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4 ml-1" />
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف اطلاعات تور</AlertDialogTitle>
                              <AlertDialogDescription>
                                آیا از حذف این اطلاعات تور اطمینان دارید؟ این عمل غیرقابل بازگشت است.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>انصراف</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteTour(tour.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteTourMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                تایید حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Tour Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>جزئیات تور</DialogTitle>
            <DialogDescription>
              اطلاعات کامل تور استخراج شده
            </DialogDescription>
          </DialogHeader>
          
          {selectedTour && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>اطلاعات اصلی</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">عنوان:</div>
                      <div>{selectedTour.title}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">مقصد:</div>
                      <div>{getDestinationName(selectedTour.destinationId)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">برند:</div>
                      <div>{getBrandName(selectedTour.brandId)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">قیمت:</div>
                      <div dir="ltr" className="text-right">{selectedTour.price || "نامشخص"}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">مدت:</div>
                      <div>{selectedTour.duration || "نامشخص"}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">وضعیت انتشار:</div>
                      <div>
                        {selectedTour.isPublished ? (
                          <Badge variant="success">منتشر شده</Badge>
                        ) : (
                          <Badge variant="outline">منتشر نشده</Badge>
                        )}
                      </div>
                    </div>
                    
                    {selectedTour.originalUrl && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">لینک اصلی:</div>
                        <div>
                          <a 
                            href={selectedTour.originalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            مشاهده <ExternalLink className="h-3 w-3 mr-1" />
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>اطلاعات فرادادهای</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">تاریخ استخراج:</div>
                      <div dir="ltr" className="text-right">
                        {formatPersianDate(selectedTour.scrapedAt)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">تاریخ ایجاد:</div>
                      <div dir="ltr" className="text-right">
                        {formatPersianDate(selectedTour.createdAt)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">آخرین بروزرسانی:</div>
                      <div dir="ltr" className="text-right">
                        {formatPersianDate(selectedTour.updatedAt)}
                      </div>
                    </div>
                    
                    {/* خدمات تور */}
                    {selectedTour.services && Array.isArray(selectedTour.services) && selectedTour.services.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">خدمات تور:</div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <ul className="list-disc list-inside space-y-1">
                            {selectedTour.services.map((service, index) => (
                              <li key={index}>{service}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* هتل‌های تور */}
                    {selectedTour.hotels && Array.isArray(selectedTour.hotels) && selectedTour.hotels.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">هتل‌های تور:</div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          {selectedTour.hotels.map((hotel, index) => (
                            <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold">{hotel.name}</span>
                                <div>
                                  <Badge variant="outline">
                                    {Array(hotel.stars).fill('★').join('')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>رتبه: {hotel.rating}</span>
                                <span className="font-semibold text-primary">{hotel.price}</span>
                              </div>
                              {hotel.imageUrl && (
                                <img 
                                  src={hotel.imageUrl} 
                                  alt={hotel.name}
                                  className="mt-2 h-20 object-cover rounded-md"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* مدارک مورد نیاز */}
                    {selectedTour.requiredDocuments && Array.isArray(selectedTour.requiredDocuments) && selectedTour.requiredDocuments.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">مدارک مورد نیاز:</div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <ul className="list-disc list-inside space-y-1">
                            {selectedTour.requiredDocuments.map((doc, index) => (
                              <li key={index}>{doc}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* سیاست کنسلی */}
                    {selectedTour.cancellationPolicy && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">شرایط کنسلی:</div>
                        <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap text-sm">
                          {selectedTour.cancellationPolicy}
                        </div>
                      </div>
                    )}

                    {selectedTour.metadata && typeof selectedTour.metadata === 'object' && (
                      <div>
                        <div className="font-medium mb-2">اطلاعات فرادادهای:</div>
                        <div className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                          {JSON.stringify(selectedTour.metadata, null, 2)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {selectedTour.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>توضیحات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap">{selectedTour.description}</div>
                  </CardContent>
                </Card>
              )}
              
              {selectedTour.imageUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>تصویر</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <img 
                        src={selectedTour.imageUrl} 
                        alt={selectedTour.title}
                        className="max-h-60 object-contain rounded-md"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  بستن
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant={selectedTour.isPublished ? "outline" : "default"}
                    onClick={() => handleTogglePublish(selectedTour.id, selectedTour.isPublished)}
                    disabled={publishTourMutation.isPending}
                  >
                    <CheckCircle className="ml-2 h-4 w-4" />
                    {selectedTour.isPublished ? "عدم انتشار" : "انتشار"}
                  </Button>
                  
                  {selectedTour.isPublished && (
                    <Button
                      onClick={() => handleSendToTelegram(selectedTour.id)}
                      disabled={sendToTelegramMutation.isPending}
                    >
                      {sendToTelegramMutation.isPending ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="ml-2 h-4 w-4" />
                      )}
                      ارسال به تلگرام
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Skyro Scrape Dialog */}
      <Dialog open={isSkyroDialogOpen} onOpenChange={setIsSkyroDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استخراج تور از SkyroTrip</DialogTitle>
            <DialogDescription>
              آدرس صفحه تور را وارد کنید تا اطلاعات آن استخراج شود.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="skyroUrl" className="text-sm font-medium">آدرس تور</label>
              <Input
                id="skyroUrl"
                placeholder="https://skyrotrip.com/package/29"
                value={skyroUrl}
                onChange={(e) => setSkyroUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">مثال: https://skyrotrip.com/package/29</p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="skyroSourceId" className="text-sm font-medium">منبع تور</label>
              <Select value={skyroSourceId?.toString()} onValueChange={(value) => setSkyroSourceId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب منبع تور" />
                </SelectTrigger>
                <SelectContent>
                  {/* ما اینجا از نتایج API استفاده می‌کنیم که در useQuery دیگری فراخوانی شده */}
                  <SelectItem value="">انتخاب کنید</SelectItem>
                  <SelectItem value="1">تور داخلی</SelectItem>
                  <SelectItem value="2">تور خارجی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="skyroDestinationId" className="text-sm font-medium">مقصد تور (اختیاری)</label>
              <Select 
                value={skyroDestinationId?.toString() || ""} 
                onValueChange={(value) => setSkyroDestinationId(value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب مقصد تور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون مقصد</SelectItem>
                  {destinations.map((destination) => (
                    <SelectItem key={destination.id} value={destination.id.toString()}>
                      {destination.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSkyroDialogOpen(false)}
            >
              انصراف
            </Button>
            <Button 
              onClick={() => skyroScrapeMutation.mutate()}
              disabled={!skyroUrl || !skyroSourceId || skyroScrapeMutation.isPending}
            >
              {skyroScrapeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              استخراج تور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Skyro Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بروزرسانی تور از SkyroTrip</DialogTitle>
            <DialogDescription>
              آدرس صفحه تور را وارد کنید تا اطلاعات تور بروزرسانی شود.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="updateTourUrl" className="text-sm font-medium">آدرس جدید تور</label>
              <Input
                id="updateTourUrl"
                placeholder="https://skyrotrip.com/package/29"
                value={updateTourUrl}
                onChange={(e) => setUpdateTourUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">مثال: https://skyrotrip.com/package/29</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUpdateDialogOpen(false)}
            >
              انصراف
            </Button>
            <Button 
              onClick={() => skyroUpdateMutation.mutate()}
              disabled={!updateTourUrl || skyroUpdateMutation.isPending}
            >
              {skyroUpdateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              بروزرسانی تور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AirlineLayout>
  );
}