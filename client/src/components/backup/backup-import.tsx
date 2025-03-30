import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UploadIcon, AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BackupImport() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/import-backup", formData, {
        isFormData: true
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "وارد کردن بک‌آپ با موفقیت انجام شد",
        description: "اطلاعات سیستم با موفقیت از فایل بک‌آپ بازیابی شد.",
        variant: "default",
      });
      // بعد از موفقیت، کش تمام API ها را باطل میکنیم تا داده‌ها مجددا لود شوند
      queryClient.invalidateQueries();
      // فایل انتخاب شده را پاک میکنیم
      setFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در وارد کردن بک‌آپ",
        description: error.message || "مشکلی در بازیابی اطلاعات از فایل بک‌آپ رخ داد.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // بررسی نوع فایل
    if (selectedFile.type !== 'application/json') {
      setError("لطفا فقط فایل JSON انتخاب کنید");
      setFile(null);
      return;
    }
    
    // بررسی اندازه فایل (حداکثر 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("اندازه فایل نباید بیشتر از 10 مگابایت باشد");
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("لطفا یک فایل بک‌آپ انتخاب کنید");
      return;
    }
    
    const formData = new FormData();
    formData.append('backupFile', file);
    
    importMutation.mutate(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>وارد کردن بک‌آپ</CardTitle>
        <CardDescription>
          بازیابی اطلاعات سیستم از فایل بک‌آپ JSON
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid w-full max-w-md items-center gap-1.5">
              <Input
                type="file"
                id="backup-file"
                accept=".json"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={importMutation.isPending}
              />
              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>خطا</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  فایل انتخاب شده: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>
          <Button 
            type="submit" 
            className="mt-4"
            disabled={!file || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <span className="ml-2">در حال پردازش...</span>
                <span className="animate-spin">◌</span>
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4 ml-2" />
                وارد کردن بک‌آپ
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="border-t pt-4 text-sm text-muted-foreground flex flex-col items-start">
        <p className="mb-1">
          <span className="font-bold">توجه:</span> وارد کردن بک‌آپ بخشی از داده‌های فعلی سیستم را با داده‌های بک‌آپ جایگزین می‌کند.
        </p>
        <p>قبل از انجام این عمل، توصیه می‌شود از اطلاعات فعلی سیستم بک‌آپ تهیه کنید.</p>
      </CardFooter>
    </Card>
  );
}