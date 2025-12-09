import { useState, useEffect, useCallback, useRef } from 'react'
import { useCheckout } from './useCheckout'
import { useCheckoutState } from './useCheckoutState'
import { CheckoutUpdateResponse } from '@/lib/checkout'
import { callEdge } from '@/lib/edge'
import { STORE_ID } from '@/lib/config'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

export interface OrderItem {
  key: string
  product_id: string
  variant_id?: string
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    price: number
    images?: string[]
  }
  variant?: {
    id: string
    name: string
    price: number
  }
}

export const useOrderItems = () => {
  const { hasActiveCheckout, orderId, updateItems: updateCheckoutItems } = useCheckout()
  const { 
    getOrderSnapshot, 
    getFreshOrder, 
    isOrderStale, 
    updateOrderCache 
  } = useCheckoutState()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())
  const [isStale, setIsStale] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const [shippingAmount, setShippingAmount] = useState<number | undefined>(undefined)
  const { toast } = useToast()
  
  // Mantener referencia al estado de updates en curso para evitar sobrescrituras
  const updatingItemsRef = useRef<Set<string>>(new Set())
  useEffect(() => { updatingItemsRef.current = updatingItems }, [updatingItems])
  
  // Debounce timer para updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Reintentos controlados para order-get
  const retryAttemptsRef = useRef(0)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Control de versiones de carga para evitar carreras
  const loadVersionRef = useRef(0)

  // Cantidades pendientes solicitadas por el usuario (protege contra sobrescrituras)
  const pendingQuantitiesRef = useRef<Map<string, number>>(new Map())
  const overlayPending = useCallback((items: OrderItem[]): OrderItem[] => {
    const map = pendingQuantitiesRef.current
    if (map.size === 0) return items
    return items.map(it => {
      const p = map.get(it.key)
      return p !== undefined ? { ...it, quantity: Math.max(it.quantity, p) } : it
    })
  }, [])

  // Shallow equality check for order items to prevent unnecessary updates
  const areItemsShallowEqual = useCallback((prev: OrderItem[], next: OrderItem[]): boolean => {
    if (prev.length !== next.length) return false
    for (let i = 0; i < prev.length; i++) {
      const a = prev[i]
      const b = next[i]
      if (a.key !== b.key || a.quantity !== b.quantity || a.price !== b.price) {
        return false
      }
    }
    return true
  }, [])

  // Use refs for checkout state functions to avoid dependency changes
  const checkoutStateRef = useRef<{
    getOrderSnapshot: () => any
    getFreshOrder: () => any
    isOrderStale: () => boolean
    updateOrderCache: (data: any) => void
  }>()
  
  // Update refs when functions change
  useEffect(() => {
    checkoutStateRef.current = {
      getOrderSnapshot,
      getFreshOrder, 
      isOrderStale,
      updateOrderCache
    }
  }, [getOrderSnapshot, getFreshOrder, isOrderStale, updateOrderCache])

  // Función para convertir items de orden al formato del hook
  const transformOrderItems = useCallback((items: any[], prev?: OrderItem[]): OrderItem[] => {
    return items.map((item: any) => {
      const prevCandidates = prev?.filter(p => p.product_id === item.product_id) || []
      const fallback = prevCandidates.length === 1 ? prevCandidates[0] : undefined
      const variant_id = item.variant_id ?? fallback?.variant_id
      // Manejar múltiples formatos de nombre de variante:
      // 1. checkout-update format: item.variant_name
      // 2. checkout-create format: item.products?.variants?.find(v => v.id === variant_id)?.title
      // 3. fallback from previous state
      let variantName = ''
      if (item.variant_name) {
        variantName = item.variant_name
      } else if (item.products?.variants && variant_id) {
        const variantFromProducts = item.products.variants.find((v: any) => v.id === variant_id)
        variantName = variantFromProducts?.title || ''
      } else if (fallback?.variant?.name) {
        variantName = fallback.variant.name
      } else {
        variantName = 'Variante'
      }

      const variant = variant_id
        ? {
            id: variant_id,
            name: variantName,
            price: (item.variant_price ?? fallback?.variant?.price ?? item.price)
          }
        : undefined

      // Debug logs temporales
      if (variant_id) {
        console.log('🔍 Variant debug:', {
          product_id: item.product_id,
          variant_id,
          variant_name_from_item: item.variant_name,
          variant_from_products: item.products?.variants?.find((v: any) => v.id === variant_id)?.title,
          variant_name_from_fallback: fallback?.variant?.name,
          final_variant_name: variant?.name,
          format_detected: item.variant_name ? 'checkout-update' : item.products?.variants ? 'checkout-create' : 'fallback'
        })
      }

      // Manejar múltiples formatos de imágenes:
      // 1. checkout-update format: item.product_images
      // 2. checkout-create format: item.products?.images
      // 3. fallback from previous state
      let productImages: string[] = []
      if (item.product_images && Array.isArray(item.product_images)) {
        productImages = item.product_images
      } else if (item.products?.images && Array.isArray(item.products.images)) {
        productImages = item.products.images
      } else if (fallback?.product.images && Array.isArray(fallback.product.images)) {
        productImages = fallback.product.images
      }

      // Manejar múltiples formatos de nombre:
      let productName = ''
      if (item.product_name) {
        productName = item.product_name
      } else if (item.products?.title) {
        productName = item.products.title
      } else if (fallback?.product.name) {
        productName = fallback.product.name
      } else {
        productName = 'Producto sin nombre'
      }

      return {
        key: `${item.product_id}${variant_id ? `:${variant_id}` : ''}`,
        product_id: item.product_id,
        variant_id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        product: {
          id: item.product_id,
          name: productName,
          price: item.price,
          images: productImages
        },
        variant
      } as OrderItem
    })
  }, [])

  // Load order items with stale-while-revalidate strategy
  const loadOrderItems = useCallback(async (retryCount = 0, forceRefresh = false) => {
    const currentVersion = ++loadVersionRef.current
    if (!hasActiveCheckout || !orderId) {
      logger.debug('useOrderItems: No active checkout, clearing items')
      setOrderItems([])
      setIsStale(false)
      setRevalidating(false)
      setLoading(false)
      setIsInitialized(true)
      return
    }

    logger.debug(`useOrderItems: Loading order items (attempt ${retryCount + 1}, forceRefresh: ${forceRefresh})`)
    
    // Use refs to access current checkout state functions
    const checkoutFunctions = checkoutStateRef.current
    if (!checkoutFunctions) return
    
    // Step 1: Show stale data immediately if available
    const snapshotOrder = checkoutFunctions.getOrderSnapshot()
    if (snapshotOrder && snapshotOrder.order_items && !forceRefresh) {
      logger.debug('useOrderItems: Showing stale data immediately')
      const items = transformOrderItems(snapshotOrder.order_items)
      const overlaidItems = overlayPending(items)
      // Only update if items actually changed
      setOrderItems(prev => areItemsShallowEqual(prev, overlaidItems) ? prev : overlaidItems)
      setLoading(false)
      setIsInitialized(true)
      
      // Check if data is stale
      const dataIsStale = checkoutFunctions.isOrderStale()
      setIsStale(dataIsStale)
      
      // If data is stale, start background revalidation
      if (dataIsStale) {
        logger.debug('useOrderItems: Data is stale, starting background revalidation')
        setRevalidating(true)
        // Continue to fetch fresh data in background
      } else {
        // Data is fresh, no need to fetch
        logger.debug('useOrderItems: Data is fresh, no revalidation needed')
        return
      }
    } else {
      // No stale data available, show loading
      setLoading(true)
      setIsStale(false)
    }

    // Step 2: Check for fresh data or fetch from backend
    try {
      const freshOrder = checkoutFunctions.getFreshOrder()
      if (freshOrder && freshOrder.order_items && !forceRefresh) {
        logger.debug('useOrderItems: Using fresh cached order items')
        const items = transformOrderItems(freshOrder.order_items)
        if (updatingItemsRef.current.size === 0) {
          const overlaidItems = overlayPending(items)
          setOrderItems(prev => areItemsShallowEqual(prev, overlaidItems) ? prev : overlaidItems)
        } else {
          logger.debug('useOrderItems: Skipping UI update with fresh cache due to in-flight updates')
        }
        setIsStale(false)
        setRevalidating(false)
        setLoading(false)
        setIsInitialized(true)
        return
      }

      // No fresh data in cache - rely on stale data or wait for next checkout-update
      logger.debug('useOrderItems: No fresh data in cache, using existing data')
      setIsStale(false)
      setRevalidating(false)
      setLoading(false)
      setIsInitialized(true)
    } catch (err: any) {
      logger.error('useOrderItems: Error accessing cached data:', err)
      setError(`Error accediendo datos: ${err.message || 'Error desconocido'}`)
      setRevalidating(false)
      setIsStale(false)
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }, [hasActiveCheckout, orderId, transformOrderItems, overlayPending, areItemsShallowEqual])

  // Initial load and when checkout state changes  
  useEffect(() => {
    loadOrderItems()
  }, [orderId, hasActiveCheckout, loadOrderItems])

  // Listen for same-tab checkout updates triggered by updateOrderCache (e.g., inventory adjustments)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>
      const updatedOrder = ce.detail
      if (updatedOrder?.order_items) {
        const items = transformOrderItems(updatedOrder.order_items, orderItems)
        // Aggressive reconciliation: drop zero-qty and dedupe by key
        const seen = new Set<string>()
        const reconciled = items.filter(it => it.quantity > 0).filter(it => {
          if (seen.has(it.key)) return false
          seen.add(it.key)
          return true
        })
        setOrderItems(reconciled)
      }
    }
    window.addEventListener('checkout:updated', handler as EventListener)
    return () => window.removeEventListener('checkout:updated', handler as EventListener)
  }, [transformOrderItems, orderItems])

  // Refresh items function for manual revalidation
  const refreshItems = useCallback(() => {
    logger.debug('useOrderItems: Manual refresh requested')
    loadOrderItems(0, true)
  }, [loadOrderItems])

  // Función para actualizar cantidad de un item con debouncing
  const updateQuantity = useCallback(async (key: string, newQuantity: number) => {
    logger.debug(`updateQuantity called: key=${key}, newQuantity=${newQuantity}`)
    
    if (newQuantity <= 0) {
      logger.debug(`updateQuantity: Quantity <= 0, calling removeItem for key=${key}`)
      return removeItem(key)
    }

    // Prevenir múltiples updates del mismo item
    if (updatingItems.has(key)) {
      console.log('Update already in progress for item:', key)
      return
    }

    // Encontrar el item que se va a actualizar para obtener sus datos completos
    const targetItem = orderItems.find(item => item.key === key)
    if (!targetItem) {
      console.error('Item not found:', key)
      return
    }

    // Marcar item como updating
    setUpdatingItems(prev => new Set([...prev, key]))

    // Guardar estado previo para rollback
    const previousItems = [...orderItems]
    
    // Actualizar localmente primero para UI responsiva (optimistic update)
    setOrderItems(prev => prev.map(item => 
      item.key === key ? { ...item, quantity: newQuantity } : item
    ))

    // Cancelar timer anterior si existe
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current)
    }

    // Registrar cantidad pendiente para proteger UI
    pendingQuantitiesRef.current.set(key, newQuantity)

    // Debounce la actualización al backend
    updateTimerRef.current = setTimeout(async () => {
      try {
        // Preparar todos los items para enviar al backend usando el estado PREVIO
        const updatedItems = previousItems.map(item => ({
          product_id: item.product_id,
          quantity: item.key === key ? newQuantity : item.quantity,
          ...(item.variant_id && { variant_id: item.variant_id })
        }))

        console.log('Sending debounced update with items:', updatedItems)

        // Actualizar en el backend con include_product_details para obtener datos completos
        const response = await updateCheckoutItems(updatedItems, true) as CheckoutUpdateResponse | void
        console.log('Items update response:', response)
        
        // Capturar shipping_amount de la respuesta
        if (response && typeof response.shipping_amount === 'number') {
          console.log('Received shipping_amount from items update:', response.shipping_amount)
          setShippingAmount(response.shipping_amount)
        }
        
        // Si checkout-update devuelve la orden completa, usar esos datos
        if (response && 'order' in response && response.order && response.order.order_items) {
          const checkoutFunctions = checkoutStateRef.current!
          checkoutFunctions.updateOrderCache(response.order)
          const serverItems = transformOrderItems(response.order.order_items, previousItems)
          // Proteger cantidad optimista: usar el máximo entre servidor y lo solicitado
          const mergedItems = serverItems.map(item => 
            item.key === key 
              ? { ...item, quantity: Math.max(item.quantity, newQuantity) }
              : item
          )
          setOrderItems(overlayPending(mergedItems))
        } 
        // Si checkout-update devuelve order_items en el top-level (respuesta ligera con product details)
        else if (response && 'order_items' in response && (response as any).order_items) {
          const serverItems = transformOrderItems((response as any).order_items, previousItems)
          // Proteger cantidad optimista: usar el máximo entre servidor y lo solicitado
          const mergedItems = serverItems.map(item => 
            item.key === key 
              ? { ...item, quantity: Math.max(item.quantity, newQuantity) }
              : item
          )
          setOrderItems(mergedItems)
        } 
        else {
          // Fallback: recargar desde el backend
          await loadOrderItems(0, true)
        }
      } catch (error) {
        console.error('Error updating quantity:', error)
        // Rollback completo al estado anterior
        setOrderItems(previousItems)
        throw error
      } finally {
        // Desmarcar item como updating
        setUpdatingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
      }
    }, 300) // 300ms debounce
  }, [orderItems, updateCheckoutItems, loadOrderItems, updateOrderCache, transformOrderItems, updatingItems])

  // Función para remover un item
  const removeItem = useCallback(async (key: string) => {
    logger.debug(`removeItem called: key=${key}`)
    
    const itemToRemove = orderItems.find(item => item.key === key)
    if (!itemToRemove) {
      logger.debug(`removeItem: Item not found for key=${key}`)
      return
    }

    logger.debug(`removeItem: Found item to remove:`, itemToRemove)

    // Guardar estado previo para rollback
    const previousItems = [...orderItems]
    
    // Actualizar localmente primero (optimistic update)
    setOrderItems(prev => prev.filter(item => item.key !== key))

    try {
      // Preparar items sin el removido
      const updatedItems = orderItems
        .filter(item => item.key !== key)
        .map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          ...(item.variant_id && { variant_id: item.variant_id })
        }))

      logger.debug(`removeItem: Calling updateCheckoutItems with:`, updatedItems)

      // Actualizar en el backend con include_product_details para obtener datos completos
      const response = await updateCheckoutItems(updatedItems, true) as CheckoutUpdateResponse | void
      
      logger.debug(`removeItem: updateCheckoutItems response:`, response)
      
      // Capturar shipping_amount de la respuesta
      if (response && typeof response.shipping_amount === 'number') {
        console.log('Received shipping_amount from item removal:', response.shipping_amount)
        setShippingAmount(response.shipping_amount)
      }
      
      // Si checkout-update devuelve la orden completa, usar esos datos
      if (response && 'order' in response && response.order && response.order.order_items) {
        const checkoutFunctions = checkoutStateRef.current!
        checkoutFunctions.updateOrderCache(response.order)
        const items = transformOrderItems(response.order.order_items, previousItems)
        setOrderItems(items)
      } 
      // Si checkout-update devuelve order_items en el top-level (respuesta ligera con product details)
      else if (response && 'order_items' in response && (response as any).order_items) {
        const items = transformOrderItems((response as any).order_items, previousItems)
        setOrderItems(items)
      } 
      else {
        // Fallback: recargar desde el backend
        await loadOrderItems(0, true)
      }
    } catch (error) {
      logger.error('removeItem: Error removing item:', error)
      console.error('Error removing item:', error)
      // Rollback completo al estado anterior
      setOrderItems(previousItems)
      throw error
    }
  }, [orderItems, updateCheckoutItems, loadOrderItems, updateOrderCache, transformOrderItems])

  // Limpiar timers de reintento en unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [])

  // Calcular totales
  const total = orderItems.reduce((sum, item) => {
    const unitPrice = item.variant?.price ?? item.product.price
    return sum + (unitPrice * item.quantity)
  }, 0)

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  return {
    orderItems,
    loading,
    error,
    total,
    totalQuantity,
    updateQuantity,
    removeItem,
    refreshItems,
    updatingItems,
    isStale,
    revalidating,
    shippingAmount
  }
}
