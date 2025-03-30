import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AirlineLayout } from "@/components/airline-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, RefreshCw, Calendar, Edit, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPersianDate } from "@/lib/formatters";
import { TourSource } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function TourSources() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<TourSource | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [scrapingSelector, setScrapingSelector] = useState("");
  const [scrapingType, setScrapingType] = useState("default");
  const [isActive, setIsActive] = useState(true);

  // Get all tour sources
  const { data: sources = [], isLoading, isError, refetch } = useQuery<TourSource[]>({
    queryKey: ["/api/tour-sources"],
    staleTime: 1000 * 60, // 1 minute
  });

  // Add tour source mutation
  const addSourceMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      url: string;
      scrapingSelector?: string;
      scrapingType: string;
      active: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/tour-sources", data);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در ثبت منبع جدید");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-sources"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "ثبت منبع جدید",
        description: "منبع جدید با موفقیت ثبت شد",
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

  // Edit tour source mutation
  const editSourceMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      source: {
        name: string;
        url: string;
        scrapingSelector?: string;
        scrapingType: string;
        active: boolean;
      };
    }) => {
      const res = await apiRequest("PATCH", `/api/tour-sources/${data.id}`, data.source);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در ویرایش منبع");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-sources"] });
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedSource(null);
      toast({
        title: "ویرایش منبع",
        description: "منبع با موفقیت ویرایش شد",
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

  // Delete tour source mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/tour-sources/${id}`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در حذف منبع");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-sources"] });
      toast({
        title: "حذف منبع",
        description: "منبع با موفقیت حذف شد",
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

  // Manual scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/tour-sources/${id}/scrape`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در استخراج اطلاعات");
      }
      return await res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      toast({
        title: "استخراج اطلاعات",
        description: "استخراج اطلاعات از منبع با موفقیت انجام شد",
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
  
  // استخراج چندگانه تورها از اسکایرو
  const [isMultipleScrapeDialogOpen, setIsMultipleScrapeDialogOpen] = useState(false);
  const [multipleScrapingSourceId, setMultipleScrapingSourceId] = useState<number | null>(null);
  const [multipleScrapingSourceUrl, setMultipleScrapingSourceUrl] = useState("");
  
  // Multiple scrape mutation
  const scrapeMultipleMutation = useMutation({
    mutationFn: async () => {
      if (!multipleScrapingSourceId || !multipleScrapingSourceUrl) {
        throw new Error("لطفا منبع و آدرس را انتخاب کنید");
      }
      
      const res = await apiRequest("POST", `/api/tour-data/skyro-scrape-multiple`, {
        sourceUrl: multipleScrapingSourceUrl,
        sourceId: multipleScrapingSourceId
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "خطا در استخراج چندگانه تورها");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tour-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tour-data"] });
      setIsMultipleScrapeDialogOpen(false);
      setMultipleScrapingSourceId(null);
      setMultipleScrapingSourceUrl("");
      
      toast({
        title: "استخراج چندگانه تورها",
        description: "فرآیند استخراج چندگانه تورها شروع شد. این فرآیند ممکن است چندین دقیقه طول بکشد.",
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

  const handleAddSource = () => {
    if (!name || !url) {
      toast({
        title: "اطلاعات ناقص",
        description: "لطفا نام و آدرس منبع را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    addSourceMutation.mutate({
      name,
      url,
      scrapingSelector: scrapingSelector || undefined,
      scrapingType,
      active: isActive,
    });
  };

  const handleEditSource = () => {
    if (!selectedSource) return;
    if (!name || !url) {
      toast({
        title: "اطلاعات ناقص",
        description: "لطفا نام و آدرس منبع را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    editSourceMutation.mutate({
      id: selectedSource.id,
      source: {
        name,
        url,
        scrapingSelector: scrapingSelector || undefined,
        scrapingType,
        active: isActive,
      },
    });
  };

  const handleDeleteSource = (id: number) => {
    deleteSourceMutation.mutate(id);
  };

  const handleScrapeSource = (id: number) => {
    scrapeMutation.mutate(id);
  };

  const prepareForEdit = (source: TourSource) => {
    setSelectedSource(source);
    setName(source.name);
    setUrl(source.url);
    setScrapingSelector(source.scrapingSelector || "");
    setScrapingType(source.scrapingType || "default");
    setIsActive(source.active);
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setScrapingSelector("");
    setScrapingType("default");
    setIsActive(true);
  };

  // Helper function for showing "Not scraped yet" message if lastScraped is null
  const getLastScrapedLabel = (lastScraped: string | Date | null) => {
    if (!lastScraped) return "استخراج نشده";
    return formatPersianDate(lastScraped);
  };

  // Multiple scrape handler
  const handleMultipleToursScrape = () => {
    if (!multipleScrapingSourceId || !multipleScrapingSourceUrl) {
      toast({
        title: "اطلاعات ناقص",
        description: "لطفا منبع و آدرس استخراج چندگانه را وارد کنید",
        variant: "destructive",
      });
      return;
    }
    
    scrapeMultipleMutation.mutate();
  };

  // Prepare for multiple scrape with a selected source
  const prepareForMultipleScrape = (source: TourSource) => {
    setMultipleScrapingSourceId(source.id);
    setMultipleScrapingSourceUrl("");
    setIsMultipleScrapeDialogOpen(true);
  };

  return (
    <AirlineLayout 
      title="مدیریت منابع تور" 
      subtitle="استخراج خودکار اطلاعات تور از منابع مختلف"
    >
      <div className="flex justify-between mb-6">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`ml-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            بروزرسانی
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsMultipleScrapeDialogOpen(true)}
          >
            <Download className="ml-2 h-4 w-4" />
            استخراج چندگانه تورها
          </Button>
        </div>
        
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" /> 
          افزودن منبع جدید
        </Button>
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
        <Table>
          <TableCaption>لیست منابع استخراج اطلاعات تور</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">نام منبع</TableHead>
              <TableHead className="text-right">آدرس</TableHead>
              <TableHead className="text-right">نوع استخراج</TableHead>
              <TableHead className="text-right">آخرین استخراج</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  هیچ منبعی ثبت نشده است
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-xs inline-block"
                    >
                      {source.url}
                    </a>
                  </TableCell>
                  <TableCell>{source.scrapingType}</TableCell>
                  <TableCell>{getLastScrapedLabel(source.lastScraped)}</TableCell>
                  <TableCell>
                    {source.active ? (
                      <Badge variant="success">فعال</Badge>
                    ) : (
                      <Badge variant="secondary">غیرفعال</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleScrapeSource(source.id)}
                        disabled={scrapeMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ml-1 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                        استخراج 
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => prepareForMultipleScrape(source)}
                      >
                        <Download className="h-4 w-4 ml-1" />
                        استخراج چندگانه
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => prepareForEdit(source)}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        ویرایش
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                            <Trash2 className="h-4 w-4 ml-1" />
                            حذف
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف منبع</AlertDialogTitle>
                            <AlertDialogDescription>
                              آیا از حذف این منبع اطمینان دارید؟ تمام داده‌های استخراج شده از این منبع نیز حذف خواهند شد.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteSource(source.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteSourceMutation.isPending && (
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
      )}
      
      {/* Add New Source Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن منبع جدید</DialogTitle>
            <DialogDescription>
              مشخصات منبع جدید برای استخراج اطلاعات تور را وارد کنید
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">نام منبع</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="مثال: علی‌بابا تور" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="url">آدرس منبع</Label>
              <Input 
                id="url" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://example.com/tours" 
                dir="ltr"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="scrapingType">نوع استخراج</Label>
              <Select value={scrapingType} onValueChange={setScrapingType}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع استخراج" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">استخراج پیش‌فرض</SelectItem>
                  <SelectItem value="alibaba">علی‌بابا</SelectItem>
                  <SelectItem value="custom">سفارشی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {scrapingType === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="scrapingSelector">سلکتور CSS (اختیاری)</Label>
                <Textarea 
                  id="scrapingSelector" 
                  value={scrapingSelector} 
                  onChange={(e) => setScrapingSelector(e.target.value)} 
                  placeholder=".tour-item" 
                  dir="ltr"
                />
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Label htmlFor="active">فعال</Label>
              <Switch 
                id="active" 
                checked={isActive} 
                onCheckedChange={setIsActive} 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleAddSource}
              disabled={addSourceMutation.isPending}
            >
              {addSourceMutation.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              ثبت منبع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Source Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش منبع</DialogTitle>
            <DialogDescription>
              مشخصات منبع استخراج اطلاعات تور را ویرایش کنید
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">نام منبع</Label>
              <Input 
                id="edit-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="مثال: علی‌بابا تور" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-url">آدرس منبع</Label>
              <Input 
                id="edit-url" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://example.com/tours" 
                dir="ltr"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-scrapingType">نوع استخراج</Label>
              <Select value={scrapingType} onValueChange={setScrapingType}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع استخراج" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">استخراج پیش‌فرض</SelectItem>
                  <SelectItem value="alibaba">علی‌بابا</SelectItem>
                  <SelectItem value="custom">سفارشی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {scrapingType === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="edit-scrapingSelector">سلکتور CSS (اختیاری)</Label>
                <Textarea 
                  id="edit-scrapingSelector" 
                  value={scrapingSelector} 
                  onChange={(e) => setScrapingSelector(e.target.value)} 
                  placeholder=".tour-item" 
                  dir="ltr"
                />
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Label htmlFor="edit-active">فعال</Label>
              <Switch 
                id="edit-active" 
                checked={isActive} 
                onCheckedChange={setIsActive} 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleEditSource}
              disabled={editSourceMutation.isPending}
            >
              {editSourceMutation.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Multiple Scrape Dialog */}
      <Dialog open={isMultipleScrapeDialogOpen} onOpenChange={setIsMultipleScrapeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>استخراج چندگانه تورها</DialogTitle>
            <DialogDescription>
              این قابلیت به شما امکان می‌دهد تمامی تورهای موجود در یک صفحه لیست تور را به صورت خودکار استخراج کنید.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sourceId">منبع تور</Label>
              <Select 
                value={multipleScrapingSourceId?.toString() || ""} 
                onValueChange={(value) => setMultipleScrapingSourceId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب منبع تور" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id.toString()}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="sourceUrl">آدرس صفحه لیست تورها</Label>
              <Input 
                id="sourceUrl" 
                value={multipleScrapingSourceUrl} 
                onChange={(e) => setMultipleScrapingSourceUrl(e.target.value)} 
                placeholder="https://skyrotrip.com/search/iran" 
                dir="ltr"
              />
              <p className="text-sm text-muted-foreground">
                آدرس باید به صفحه‌ای اشاره کند که لیستی از تورها را نمایش می‌دهد. مثلاً صفحه جستجو یا دسته‌بندی تورها.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMultipleScrapeDialogOpen(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleMultipleToursScrape}
              disabled={scrapeMultipleMutation.isPending}
            >
              {scrapeMultipleMutation.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              شروع استخراج چندگانه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AirlineLayout>
  );
}