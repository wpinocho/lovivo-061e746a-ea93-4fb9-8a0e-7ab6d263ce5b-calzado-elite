import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determina si una variante está disponible
 * - Si existe el campo "available", lo usa directamente
 * - Si no existe, usa inventory_quantity > 0
 */
export const isVariantAvailable = (variant: any): boolean => {
  if (typeof variant.available === 'boolean') {
    return variant.available
  }
  return (variant.inventory_quantity ?? 0) > 0
}
