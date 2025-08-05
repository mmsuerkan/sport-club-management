import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate (date: any): string {
    if (
        date &&
        typeof date === "object" &&
        typeof date.toDate === "function"
    ) {
        return date.toDate().toLocaleDateString("tr-TR");
    } else if (date instanceof Date || typeof date === "string") {
        return new Date(date).toLocaleDateString("tr-TR");
    }
    return "Tarih belirtilmemiş";
}