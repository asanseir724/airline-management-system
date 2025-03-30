/**
 * Date formatting utilities for consistent formatting in the application
 */

/**
 * Format a date string (or Date object) to Persian date format
 * @param date Date as string or Date object or null
 * @param includeTime Whether to include time in the formatted string
 * @returns Formatted date string
 */
export function formatPersianDate(date: string | Date | null | undefined, includeTime = true): string {
  if (!date) return "نامشخص";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      ...(includeTime ? {
        hour: '2-digit',
        minute: '2-digit'
      } : {})
    }).format(dateObj);
  } catch (error) {
    return typeof date === 'string' ? date : date.toString();
  }
}

/**
 * Format a price with proper Persian formatting
 * @param price Price as string or number
 * @returns Formatted price string
 */
export function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined) return "نامشخص";
  
  try {
    const priceValue = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
    
    if (isNaN(priceValue)) return String(price);
    
    return new Intl.NumberFormat('fa-IR', {
      maximumFractionDigits: 0
    }).format(priceValue);
  } catch {
    return String(price);
  }
}