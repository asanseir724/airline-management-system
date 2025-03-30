/**
 * ایجاد گلوگاه برای محدود کردن نرخ فراخوانی توابع
 * این تابع به ویژه برای محدود کردن تعداد درخواست‌های HTTP به یک سرور مفید است
 * 
 * @param fn تابعی که باید گلوگاه شود
 * @param delay تاخیر بین فراخوانی‌ها به میلی‌ثانیه
 * @returns نسخه گلوگاه شده تابع
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = 0;
  
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    const timeToWait = delay - (now - lastCall);
    
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    lastCall = Date.now();
    return fn(...args);
  };
}