import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'PYG') {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  if (currency === 'USD') {
    return numericValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  // Format PYG (Guaranis)
  return 'Gs ' + numericValue.toLocaleString('es-PY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

