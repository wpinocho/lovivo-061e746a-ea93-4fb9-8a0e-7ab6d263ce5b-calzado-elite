import { useCart } from "@/contexts/CartContext"
import { useCartUI } from "@/components/CartProvider"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/contexts/SettingsContext"
import type { Product, ProductVariant, ProductOption } from "@/lib/supabase"
import { useMemo, useState, useEffect } from "react"
import { trackAddToCart, tracking } from "@/lib/tracking-utils"
import { isVariantAvailable } from "@/lib/utils"

/**
 * FORBIDDEN ADAPTER - ProductAdapter
 * 
 * Este adaptador expone toda la lógica de los productos de forma controlada.
 * Los componentes de UI solo pueden consumir estos métodos, no modificar la lógica interna.
 */
export const useProductCardLogic = (product: Product) => {
  const { addItem } = useCart()
  const { openCart } = useCartUI()
  const { toast } = useToast()
  const { formatMoney, currencyCode } = useSettings()
  const [selected, setSelected] = useState<Record<string, string>>({})
  
  const options = (product as any).options as ProductOption[] | undefined
  const variants = (product as any).variants as ProductVariant[] | undefined
  const hasVariants = Array.isArray(variants) && variants.length > 0

  const isOptionValueAvailable = (optName: string, value: string) => {
    if (!hasVariants) return true
    const anyProduct = product as any
    // If track_inventory is false, always show as in stock
    if (anyProduct.track_inventory === false) return true
    
    // Check if there's at least one variant that:
    // 1. Has this option value
    // 2. Has all currently selected other option values
    // 3. Has inventory > 0
    return variants?.some(v => {
      const ov = (v as any).options || {}
      
      // Check if this variant has the option value we're testing
      if (ov[optName] !== value) return false
      
      // Check if this variant matches all other currently selected options
      for (const [selectedOptName, selectedValue] of Object.entries(selected)) {
        if (selectedOptName !== optName && ov[selectedOptName] !== selectedValue) {
          return false
        }
      }
      
      // Check if this variant is available
      return isVariantAvailable(v)
    }) ?? false
  }

  // Auto-select options that have only one available value
  useEffect(() => {
    if (!hasVariants || !options?.length) return
    
    const newSelected = { ...selected }
    let hasChanges = false
    
    for (const opt of options) {
      // Get all available values for this option
      const availableValues = opt.values.filter(val => isOptionValueAvailable(opt.name, val))
      
      // If there's only one available value and it's not already selected, select it
      if (availableValues.length === 1 && !selected[opt.name]) {
        newSelected[opt.name] = availableValues[0]
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      setSelected(newSelected)
    }
  }, [hasVariants, options, variants, product.id]) // Include product.id to reset when product changes

  const inStock = useMemo(() => {
    const anyProduct = product as any
    // If track_inventory is false, always show as in stock
    if (anyProduct.track_inventory === false) return true
    
    const inv = anyProduct.inventory_quantity
    if (typeof inv === 'number') return (inv || 0) > 0
    if (hasVariants) return variants!.some(v => isVariantAvailable(v))
    return true
  }, [product, hasVariants, variants])

  const matchingVariant = useMemo(() => {
    if (!hasVariants || !options?.length) return undefined
    // Require all options to be selected
    for (const opt of options) {
      if (!selected[opt.name]) return undefined
    }
    return variants?.find(v => {
      const ov = (v as any).options || {}
      return options.every(opt => ov[opt.name] === selected[opt.name])
    })
  }, [hasVariants, options, variants, selected])

  const handleAddToCart = () => {
    const variantToAdd = hasVariants ? matchingVariant : undefined
    if (hasVariants && !variantToAdd) {
      toast({
        title: "Selecciona opciones",
        description: "Elige una variante disponible.",
      })
      return
    }
    addItem(product, variantToAdd)
    
    // Track AddToCart event with proper formatting
    trackAddToCart({
      products: [tracking.createTrackingProduct({
        id: product.id,
        title: product.title,
        price: currentPrice,
        category: 'product',
        variant: variantToAdd
      })],
      value: currentPrice,
      currency: tracking.getCurrencyFromSettings(currencyCode),
      num_items: 1
    })
    
    // Abrir el carrito automáticamente
    setTimeout(() => openCart(), 300)
  }

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelected((prev) => {
      if (prev[optionName] === value) {
        // Deselect if already selected
        const newSelected = { ...prev }
        delete newSelected[optionName]
        return newSelected
      }
      // Select if not selected
      return { ...prev, [optionName]: value }
    })
  }
  
  // Calculate price - if has variants, show selected variant price or minimum variant price
  const currentPrice = useMemo(() => {
    if (matchingVariant) return matchingVariant.price as number
    if (hasVariants && variants?.length) {
      // Show minimum price from variants when no selection is made
      return Math.min(...variants.map(v => v.price as number))
    }
    return product.price as number
  }, [matchingVariant, hasVariants, variants, product.price])
  
  const currentCompareAt = (matchingVariant?.compare_at_price ?? product.compare_at_price) as number | undefined

  return {
    // Datos del producto
    product,
    options,
    variants,
    hasVariants,
    
    // Estado de selección
    selected,
    matchingVariant,
    
    // Precios y disponibilidad
    currentPrice,
    currentCompareAt,
    inStock,
    
    // Funciones de selección
    handleOptionSelect,
    isOptionValueAvailable,
    
    // Acción principal
    handleAddToCart,
    canAddToCart: inStock && (!hasVariants || matchingVariant),
    
    // Utilidades
    formatMoney,
    
    // Datos calculados para UI
    hasDiscount: currentCompareAt && currentPrice && currentCompareAt > currentPrice,
    discountPercentage: currentCompareAt && currentPrice && currentCompareAt > currentPrice 
      ? Math.round(((currentCompareAt - currentPrice) / currentCompareAt) * 100) 
      : 0,
    
    // Features adicionales
    isFeatured: product.featured,
  }
}