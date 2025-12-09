import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type Product as ProductType } from '@/lib/supabase'
import { STORE_ID } from '@/lib/config'
import { useCart } from '@/contexts/CartContext'
import { useCartUI } from '@/components/CartProvider'
import { useToast } from '@/hooks/use-toast'
import { useSettings } from '@/contexts/SettingsContext'
import { trackViewContent, trackAddToCart, tracking } from '@/lib/tracking-utils'
import { isVariantAvailable } from '@/lib/utils'

/**
 * FORBIDDEN HEADLESS COMPONENT - HeadlessProduct
 * 
 * Este componente contiene toda la lógica de negocio de la página de producto:
 * - Fetching de producto desde Supabase
 * - Manejo de variantes y opciones
 * - Cálculos de precios e inventario
 * - Lógica de imágenes y thumbnails
 * - Funciones de agregar al carrito con tracking
 * - Estados de carga y navegación
 */

export const useProductLogic = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductType | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  
  const { addItem, getTotalItems } = useCart()
  const { openCart } = useCartUI()
  const { toast } = useToast()
  const { formatMoney, currencyCode } = useSettings()

  useEffect(() => {
    if (slug) {
      fetchProduct()
    }
  }, [slug])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('store_id', STORE_ID)
        .single()

      if (error || !data) {
        setNotFound(true)
        return
      }

      setProduct(data)
      // Set first image as selected
      if (data.images && data.images.length > 0) {
        setSelectedImage(data.images[0])
      }
      
      // Track ViewContent event with proper formatting
      trackViewContent({
        products: [tracking.createTrackingProduct({
          id: data.id,
          title: data.title,
          price: data.price,
          category: 'product'
        })],
        value: data.price,
        currency: tracking.getCurrencyFromSettings(currencyCode)
      })
    } catch (error) {
      console.error('Error fetching product:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  // Auto-select options that have only one available value
  useEffect(() => {
    if (!product) return
    
    const options = (product as any).options
    const variants = (product as any).variants
    const hasVariants = Array.isArray(variants) && variants.length > 0
    
    if (!hasVariants || !options?.length) return
    
    const newSelected = { ...selected }
    let hasChanges = false
    
    for (const opt of options) {
      // Get all available values for this option
      const availableValues = opt.values.filter((val: string) => isOptionValueAvailable(opt.name, val))
      
      // If there's only one available value and it's not already selected, select it
      if (availableValues.length === 1 && !selected[opt.name]) {
        newSelected[opt.name] = availableValues[0]
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      setSelected(newSelected)
    }
  }, [product, selected])

  const isOptionValueAvailable = (optName: string, value: string) => {
    if (!product) return false
    
    const variants = (product as any).variants
    if (!Array.isArray(variants)) return true
    
    const anyProduct = product as any
    if (anyProduct.track_inventory === false) return true
    
    return variants.some((v: any) => {
      const ov = v.options || {}
      
      if (ov[optName] !== value) return false
      
      for (const [selectedOptName, selectedValue] of Object.entries(selected)) {
        if (selectedOptName !== optName && ov[selectedOptName] !== selectedValue) {
          return false
        }
      }
      
      return isVariantAvailable(v)
    })
  }

  const getMatchingVariant = () => {
    if (!product) return undefined
    
    const options = (product as any).options
    const variants = (product as any).variants
    const hasVariants = Array.isArray(variants) && variants.length > 0
    
    if (!hasVariants || !options?.length) return undefined
    
    for (const opt of options) {
      if (!selected[opt.name]) return undefined
    }
    
    return variants?.find((v: any) => {
      const ov = v.options || {}
      return options.every((opt: any) => ov[opt.name] === selected[opt.name])
    })
  }

  const getCurrentPrice = () => {
    const matchingVariant = getMatchingVariant()
    if (matchingVariant) return matchingVariant.price
    
    const variants = (product as any)?.variants
    if (Array.isArray(variants) && variants.length > 0) {
      return Math.min(...variants.map((v: any) => v.price))
    }
    
    return product?.price || 0
  }

  const getCurrentCompareAt = () => {
    const matchingVariant = getMatchingVariant()
    return matchingVariant?.compare_at_price ?? product?.compare_at_price
  }

  const getCurrentImage = () => {
    const matchingVariant = getMatchingVariant()
    return matchingVariant?.image || selectedImage || product?.images?.[0] || ''
  }

  const isInStock = () => {
    if (!product) return false
    
    const anyProduct = product as any
    if (anyProduct.track_inventory === false) return true
    
    const variants = anyProduct.variants
    if (Array.isArray(variants) && variants.length > 0) {
      const matchingVariant = getMatchingVariant()
      if (matchingVariant) {
        return isVariantAvailable(matchingVariant)
      }
      return variants.some((v: any) => isVariantAvailable(v))
    }
    
    return (anyProduct.inventory_quantity ?? 0) > 0
  }

  const handleAddToCart = () => {
    if (!product) return
    
    const variants = (product as any).variants
    const hasVariants = Array.isArray(variants) && variants.length > 0
    const variantToAdd = hasVariants ? getMatchingVariant() : undefined
    
    if (hasVariants && !variantToAdd) {
      toast({
        title: "Selecciona opciones",
        description: "Elige una variante disponible.",
      })
      return
    }
    
    for (let i = 0; i < quantity; i++) {
      addItem(product, variantToAdd)
    }
    
    // Track AddToCart event with proper formatting
    const currentPrice = getCurrentPrice()
    trackAddToCart({
      products: [tracking.createTrackingProduct({
        id: product.id,
        title: product.title,
        price: currentPrice,
        category: 'product',
        variant: variantToAdd
      })],
      value: currentPrice * quantity,
      currency: tracking.getCurrencyFromSettings(currencyCode),
      num_items: quantity
    })
    
    toast({
      title: "Producto agregado",
      description: `${quantity} ${product.title} agregado al carrito.`,
    })
    
    setTimeout(() => openCart(), 300)
  }

  const handleNavigateBack = () => navigate(-1)
  const handleNavigateToCart = () => navigate('/cart')

  const handleOptionSelect = (optName: string, value: string) => {
    setSelected(prev => ({ ...prev, [optName]: value }))
  }

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity))
  }

  // Calculated values
  const options = product ? (product as any).options : undefined
  const variants = product ? (product as any).variants : undefined
  const hasVariants = Array.isArray(variants) && variants.length > 0
  const currentPrice = getCurrentPrice()
  const currentCompareAt = getCurrentCompareAt()
  const currentImage = getCurrentImage()
  const inStock = isInStock()
  const matchingVariant = getMatchingVariant()
  
  const discountPercentage = currentCompareAt && currentPrice && currentCompareAt > currentPrice 
    ? Math.round(((currentCompareAt - currentPrice) / currentCompareAt) * 100)
    : undefined

  return {
    // State
    product,
    loading,
    notFound,
    selectedImage,
    selected,
    quantity,
    
    // Calculated values
    options,
    variants,
    hasVariants,
    currentPrice,
    currentCompareAt,
    currentImage,
    inStock,
    matchingVariant,
    discountPercentage,
    
    // Cart info
    totalItems: getTotalItems(),
    
    // Actions
    handleAddToCart,
    handleNavigateBack,
    handleNavigateToCart,
    handleOptionSelect,
    handleQuantityChange,
    setSelectedImage,
    isOptionValueAvailable,
    
    // Utilities
    formatMoney,
    
    // States for UI
    canAddToCart: inStock && (!hasVariants || !!matchingVariant),
    
    // Events for additional features
    onAddToCartSuccess: () => {
      console.log('Product added to cart from product page - ready for additional features')
    }
  }
}

interface HeadlessProductProps {
  children: (logic: ReturnType<typeof useProductLogic>) => React.ReactNode
}

export const HeadlessProduct = ({ children }: HeadlessProductProps) => {
  const productLogic = useProductLogic()
  
  return <>{children(productLogic)}</>
}