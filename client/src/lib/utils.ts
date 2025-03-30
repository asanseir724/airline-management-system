import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * فرمت تاریخ به صورت فارسی
 * @param dateString تاریخ به صورت رشته یا آبجکت Date
 * @returns تاریخ فرمت شده به صورت فارسی
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '---';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '---';
    
    // فرمت تاریخ به صورت فارسی
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '---';
  }
}
