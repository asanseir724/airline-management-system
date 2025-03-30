/**
 * تابع محدودکننده سرعت درخواست‌ها
 * 
 * با استفاده از این تابع می‌توان تعداد درخواست‌های ارسالی به سرور را کنترل کرد
 * و از مسدود شدن آدرس IP به دلیل ارسال درخواست‌های بیش از حد جلوگیری کرد
 * 
 * @param func - تابعی که می‌خواهیم اجرای آن را محدود کنیم
 * @param wait - زمان انتظار بین هر درخواست (میلی‌ثانیه)
 * @returns - تابع محدود شده
 */
export function throttle<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let queuedArgs: Parameters<T> | null = null;
  let queuedResolve: ((value: ReturnType<T> | PromiseLike<ReturnType<T>>) => void) | null = null;
  let queuedReject: ((reason?: any) => void) | null = null;
  let lastCallTime = 0;

  // تابع اصلی را برمی‌گرداند که با محدودیت زمانی اجرا می‌شود
  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const context = this;
    
    // یک Promise برمی‌گرداند که نتیجه تابع را بعد از اجرا باز می‌گرداند
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      // تابع اجرای عملیات
      const execute = function () {
        lastCallTime = Date.now();
        timeout = null;
        
        try {
          const result = func.apply(context, args);
          
          // اگر نتیجه یک Promise است، آن را مدیریت می‌کنیم
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          } else {
            resolve(result as ReturnType<T>);
          }
          
          // اگر درخواستی در صف است، آن را اجرا می‌کنیم
          if (queuedArgs && queuedResolve && queuedReject) {
            const nextArgs = queuedArgs;
            const nextResolve = queuedResolve;
            const nextReject = queuedReject;
            
            queuedArgs = null;
            queuedResolve = null;
            queuedReject = null;
            
            // درخواست بعدی را با تاخیر اجرا می‌کنیم
            timeout = setTimeout(() => {
              lastCallTime = Date.now();
              
              try {
                const nextResult = func.apply(context, nextArgs);
                
                if (nextResult instanceof Promise) {
                  nextResult.then(nextResolve).catch(nextReject);
                } else {
                  nextResolve(nextResult as ReturnType<T>);
                }
              } catch (e) {
                nextReject(e);
              }
              
              timeout = null;
            }, wait);
          }
        } catch (e) {
          reject(e);
        }
      };
      
      // محاسبه زمان باقی‌مانده تا اجرای بعدی
      const remaining = Math.max(0, lastCallTime + wait - now);
      
      if (timeout) {
        // اگر تایمر فعال است، این درخواست را در صف قرار می‌دهیم
        queuedArgs = args;
        queuedResolve = resolve;
        queuedReject = reject;
      } else if (remaining > 0) {
        // اگر هنوز زمان کافی نگذشته، با تاخیر اجرا می‌کنیم
        timeout = setTimeout(execute, remaining);
      } else {
        // در غیر این صورت، بلافاصله اجرا می‌کنیم
        execute();
      }
    });
  };
}