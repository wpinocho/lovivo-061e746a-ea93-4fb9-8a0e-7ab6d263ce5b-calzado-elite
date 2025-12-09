import { useState, useCallback, useRef, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSettings } from '@/contexts/SettingsContext'
import { createCheckoutFromCart, createSampleOrder, updateCheckout, type CheckoutUpdatePayload } from '@/lib/checkout'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { useCheckoutState } from './useCheckoutState'
import type { CheckoutResponse } from '@/lib/supabase'
import { STORE_ID } from '@/lib/config'

interface CheckoutOptions {
  customerInfo?: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }
  discountCode?: string
  shippingAddress?: any
  billingAddress?: any
  notes?: string
  currencyCode?: string
}

export const useCheckout = () => {
  const { state: cart, clearCart } = useCart()
  const { toast } = useToast()
  const { currencyCode, formatMoney } = useSettings()
  const { checkoutState, saveCheckoutState, clearCheckoutState, updateOrderCache, updateDiscountCode: updateDiscountCodeInState, getCurrentDiscountCode, hasActiveCheckout, isInitialized, orderId, checkoutToken } = useCheckoutState()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStates, setUpdateStates] = useState({
    updating_address: false,
    updating_items: false,
    updating_discount: false,
    updating_notes: false
  })
  const [lastOrder, setLastOrder] = useState<CheckoutResponse | null>(null)
  
  // Separate debounce timers for different update types
  const shippingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const billingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const discountTimerRef = useRef<NodeJS.Timeout | null>(null)
  const notesTimerRef = useRef<NodeJS.Timeout | null>(null)
  const itemsTimerRef = useRef<NodeJS.Timeout | null>(null)

  const checkout = async (options: CheckoutOptions = {}): Promise<CheckoutResponse> => {
    setIsLoading(true)
    try {
      const order = await createCheckoutFromCart(
        cart.items,
        options.customerInfo,
        options.discountCode,
        options.shippingAddress,
        options.billingAddress,
        options.notes,
        options.currencyCode || currencyCode
      )

      // Guardar estado de checkout con la orden completa
      saveCheckoutState({
        order_id: order.order_id,
        checkout_token: order.checkout_token,
        store_id: STORE_ID,
        discount_code: options.discountCode,
        order: order.order // Ahora siempre viene la orden completa
      })

      console.log('Checkout state saved with order:', order.order)

      setLastOrder(order)
      
      // Handle unavailable items notification
      if (order.unavailable_items && order.unavailable_items.length > 0) {
        const unavailableCount = order.unavailable_items.length
        const itemText = unavailableCount === 1 ? 'item' : 'items'
        toast({
          title: "Items out of stock",
          description: `${unavailableCount} ${itemText} removed from your order due to insufficient stock`,
          variant: "destructive",
        })
        
        // Auto dismiss after 3 seconds
        setTimeout(() => {
          // Toast will auto-dismiss based on shadcn default behavior
        }, 3000)
      }

      // Limpiar carrito después de crear la orden
      clearCart()
      
      return order
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      // Si el error es de productos inexistentes, limpiar carrito
      if (errorMessage.includes("don't exist") || errorMessage.includes("not active")) {
        clearCart()
        toast({
          title: "Carrito desactualizado",
          description: "Los productos en tu carrito ya no están disponibles. Tu carrito ha sido limpiado.",
        })
      } else {
        toast({
          title: "Error al procesar la orden",
          description: errorMessage,
          variant: "destructive",
        })
      }
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Función específica para actualizar items (puede recibir CartItems o items planos)
  const updateItems = useCallback(async (items: any[] = cart.items, immediate = true, includeProductDetails = true) => {
    logger.debug(`updateItems called with ${items.length} items, immediate: ${immediate}, includeProductDetails: ${includeProductDetails}`)
    logger.debug('updateItems - items data:', items)
    
    const updateState = { updating_items: true }
    setUpdateStates(prev => ({ ...prev, ...updateState }))

    // Cancelar timer anterior específico para items
    if (itemsTimerRef.current) {
      clearTimeout(itemsTimerRef.current)
    }

    try {
      // Convertir a formato de checkout dependiendo del tipo de input
      // IMPORTANTE: Nunca enviar items con quantity <= 0 (eliminar = excluir del array)
      const sourceItems = items.filter((item: any) => (item?.quantity ?? 0) > 0)
      if (sourceItems.length !== items.length) {
        logger.debug('updateItems: filtered out zero-quantity items', {
          before: items.length,
          after: sourceItems.length
        })
      }

      const checkoutItems = sourceItems.map(item => {
        // Si viene del carrito (CartItem)
        if (item.product && item.key) {
          return {
            product_id: item.product.id,
            quantity: item.quantity,
            ...(item.variant && { variant_id: item.variant.id })
          }
        }
        // Si viene directo con product_id (OrderItem)
        else {
          return {
            product_id: item.product_id,
            quantity: item.quantity,
            ...(item.variant_id && { variant_id: item.variant_id })
          }
        }
      })

      if (immediate) {
        logger.debug('Executing immediate items update with checkout items:', checkoutItems);
        const currentDiscountCode = getCurrentDiscountCode()
        console.log('🛒 updateItems - sending discount_code:', currentDiscountCode);
        console.log('Executing immediate items update');
        const response = await updateCheckout({
          order_id: orderId!,
          checkout_token: checkoutToken!,
          items: checkoutItems,
          discount_code: currentDiscountCode,
          include_product_details: includeProductDetails
        })
        logger.debug('Immediate items update response:', response);
        return response
      } else {
        logger.debug('Setting debounced items update with checkout items:', checkoutItems);
        console.log('Setting debounced items update timer with 300ms delay');
        return new Promise((resolve, reject) => {
          itemsTimerRef.current = setTimeout(async () => {
            try {
              logger.debug('Executing debounced items update');
              const currentDiscountCode = getCurrentDiscountCode()
              console.log('🛒 debounced updateItems - sending discount_code:', currentDiscountCode);
              console.log('Executing debounced items update');
              const response = await updateCheckout({
                order_id: orderId!,
                checkout_token: checkoutToken!,
                items: checkoutItems,
                discount_code: currentDiscountCode,
                include_product_details: includeProductDetails
              })
              logger.debug('Debounced items update response:', response);
              resolve(response)
            } catch (error) {
              console.error('Error updating items:', error)
              reject(error)  
            }
          }, 300)
        })
      }
    } catch (error) {
      logger.error('updateItems: Error updating items:', error);
      
      // Parse specific error message from backend
      let errorMessage = "No se pudieron actualizar los productos"
      let errorTitle = "Error al actualizar productos"
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase()
        
        // Check for inventory errors
        if (errorText.includes('insufficient inventory') || errorText.includes('not enough stock')) {
          errorTitle = "Insufficient Stock"
          
          // Extract product name from error message if possible
          const originalMessage = error.message
          const productMatch = originalMessage.match(/for (.+?)(?:\.|$|Available:)/i)
          const productName = productMatch ? productMatch[1].trim() : 'this product'
          
          errorMessage = `Not enough stock available for ${productName}`
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    } finally {
      setUpdateStates(prev => ({ ...prev, updating_items: false }))
    }
  }, [cart.items, orderId, checkoutToken, toast])

  // Mantener una referencia estable a updateItems para sincronización con el carrito
  const updateItemsRef = useRef(updateItems)
  useEffect(() => { updateItemsRef.current = updateItems }, [updateItems])
  
  // Función específica para actualizar dirección de envío
  const updateShippingAddress = useCallback(async (shippingAddress: any, immediate = false) => {
    const updateState = { updating_address: true }
    setUpdateStates(prev => ({ ...prev, ...updateState }))

    // Cancelar timer anterior específico para shipping
    if (shippingTimerRef.current) {
      clearTimeout(shippingTimerRef.current)
    }

    try {
      if (immediate) {
        console.log('Executing immediate shipping address update');
        await updateCheckout({
          order_id: orderId!,
          checkout_token: checkoutToken!,
          shipping_address: shippingAddress
        })
        setUpdateStates(prev => ({ ...prev, updating_address: false }))
      } else {
        console.log('Setting debounced shipping address update timer with 500ms delay');
        return new Promise((resolve, reject) => {
          shippingTimerRef.current = setTimeout(async () => {
            try {
              console.log('Executing debounced shipping address update');
              const response = await updateCheckout({
                order_id: orderId!,
                checkout_token: checkoutToken!,
                shipping_address: shippingAddress
              })
              setUpdateStates(prev => ({ ...prev, updating_address: false }))
              resolve(response)
            } catch (error) {
              console.error('Error updating shipping address:', error)
              setUpdateStates(prev => ({ ...prev, updating_address: false }))
              reject(error)  
            }
          }, 500)
        })
      }
    } catch (error) {
      setUpdateStates(prev => ({ ...prev, updating_address: false }))
      toast({
        title: "Error al actualizar dirección",
        description: "No se pudo actualizar la dirección de envío",
        variant: "destructive",
      })
      throw error
    }
  }, [orderId, checkoutToken, toast])

  // Función específica para actualizar dirección de facturación
  const updateBillingAddress = useCallback(async (billingAddress: any, immediate = false) => {
    const updateState = { updating_address: true }
    setUpdateStates(prev => ({ ...prev, ...updateState }))

    // Cancelar timer anterior específico para billing
    if (billingTimerRef.current) {
      clearTimeout(billingTimerRef.current)
    }

    try {
      if (immediate) {
        console.log('Executing immediate billing address update');
        await updateCheckout({
          order_id: orderId!,
          checkout_token: checkoutToken!,
          billing_address: billingAddress
        })
      } else {
        console.log('Setting debounced billing address update timer with 500ms delay');
        return new Promise((resolve, reject) => {
          billingTimerRef.current = setTimeout(async () => {
            try {
              console.log('Executing debounced billing address update');
              const response = await updateCheckout({
                order_id: orderId!,
                checkout_token: checkoutToken!,
                billing_address: billingAddress
              })
              resolve(response)
            } catch (error) {
              console.error('Error updating billing address:', error)
              reject(error)  
            }
          }, 500)
        })
      }
    } catch (error) {
      toast({
        title: "Error al actualizar dirección de facturación",
        description: "No se pudo actualizar la dirección de facturación",
        variant: "destructive",
      })
      throw error
    } finally {
      setUpdateStates(prev => ({ ...prev, updating_address: false }))
    }
  }, [orderId, checkoutToken, toast])

  // Función para actualizar código de descuento
  const updateDiscountCode = useCallback(async (discountCode: string | null, immediate = false) => {
    console.log('updateDiscountCode called with:', { discountCode, immediate, orderId, checkoutToken, hasActiveCheckout });
    
    const updateState = { updating_discount: true }
    setUpdateStates(prev => ({ ...prev, ...updateState }))

    // Cancelar timer anterior específico para discount
    if (discountTimerRef.current) {
      clearTimeout(discountTimerRef.current)
    }

    try {
      if (immediate) {
        console.log('Executing immediate discount code update');
        const response = await updateCheckout({
          order_id: orderId!,
          checkout_token: checkoutToken!,
          discount_code: discountCode
        })
        
        // Update the discount code in local state
        updateDiscountCodeInState(discountCode)
        
        return response
      } else {
        console.log('Setting debounced discount code update timer with 500ms delay');
        return new Promise((resolve, reject) => {
          discountTimerRef.current = setTimeout(async () => {
            try {
              console.log('Executing debounced discount code update');
              const response = await updateCheckout({
                order_id: orderId!,
                checkout_token: checkoutToken!,
                discount_code: discountCode
              })
              
              // Update the discount code in local state
              updateDiscountCodeInState(discountCode)
              
              resolve(response)
            } catch (error) {
              console.error('Error updating discount code:', error)
              reject(error)  
            }
          }, 500)
        })
      }
    } catch (error) {
      console.error('updateDiscountCode error:', error);
      toast({
        title: "Error al aplicar descuento",
        description: "No se pudo aplicar el código de descuento",
        variant: "destructive",
      })
      throw error
    } finally {
      setUpdateStates(prev => ({ ...prev, updating_discount: false }))
    }
  }, [orderId, checkoutToken, hasActiveCheckout, toast])

  // Función para actualizar notas
  const updateNotes = useCallback(async (notes: string | null, immediate = false) => {
    const updateState = { updating_notes: true }
    setUpdateStates(prev => ({ ...prev, ...updateState }))

    // Cancelar timer anterior específico para notes
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current)
    }

    try {
      if (immediate) {
        console.log('Executing immediate notes update');
        await updateCheckout({
          order_id: orderId!,
          checkout_token: checkoutToken!,
          notes: notes
        })
      } else {
        console.log('Setting debounced notes update timer with 500ms delay');
        return new Promise((resolve, reject) => {
          notesTimerRef.current = setTimeout(async () => {
            try {
              console.log('Executing debounced notes update');
              const response = await updateCheckout({
                order_id: orderId!,
                checkout_token: checkoutToken!,
                notes: notes
              })
              resolve(response)
            } catch (error) {
              console.error('Error updating notes:', error)
              reject(error)  
            }
          }, 500)
        })
      }
    } catch (error) {
      toast({
        title: "Error al actualizar notas",
        description: "No se pudieron actualizar las notas del pedido",
        variant: "destructive",
      })
      throw error
    } finally {
      setUpdateStates(prev => ({ ...prev, updating_notes: false }))
    }
  }, [orderId, checkoutToken, toast])

  // Listen for checkout updates from other components (e.g., StripePayment)
  useEffect(() => {
    const handleCheckoutUpdate = (event: CustomEvent) => {
      console.log('🔄 Checkout updated from external component:', event.detail)
      setLastOrder(prevOrder => {
        if (!prevOrder) return null
        return {
          ...prevOrder,
          order: event.detail
        }
      })
    }

    window.addEventListener('checkout:updated', handleCheckoutUpdate as EventListener)
    return () => window.removeEventListener('checkout:updated', handleCheckoutUpdate as EventListener)
  }, [])

  // Sync lastOrder with checkoutState.order on initialization
  useEffect(() => {
    if (checkoutState?.order && !lastOrder) {
      console.log('🔄 Syncing lastOrder with checkoutState.order')
      setLastOrder({
        order_id: checkoutState.order_id!,
        checkout_token: checkoutState.checkout_token!,
        order_number: checkoutState.order.order_number || '',
        subtotal: checkoutState.order.subtotal || 0,
        tax_amount: checkoutState.order.tax_amount || 0,
        shipping_amount: checkoutState.order.shipping_amount || 0,
        discount_amount: checkoutState.order.discount_amount || 0,
        total_amount: checkoutState.order.total_amount || 0,
        currency_code: checkoutState.order.currency_code || 'mxn',
        status: checkoutState.order.status || 'pending',
        order: checkoutState.order
      })
    }
  }, [checkoutState?.order, lastOrder])

  // SEPARACIÓN: Ya no conectamos automáticamente con CartContext
  // El checkout manejará sus propios productos internamente

  const createSample = async (): Promise<CheckoutResponse> => {
    setIsLoading(true)
    try {
      const order = await createSampleOrder()
      setLastOrder(order)
      
      toast({
        title: "Orden de ejemplo creada",
        description: `Orden #${order.order_number} por ${formatMoney(order.total_amount)}`,
      })
      
      return order
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast({
        title: "Error al crear orden de ejemplo",
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // Checkout inicial
    checkout,
    createSample,
    
    // Estado del checkout
    hasActiveCheckout,
    isInitialized,
    orderId,
    checkoutToken,
    clearCheckoutState,
    
    // Estados de loading
    isLoading,
    isUpdating,
    updateStates,
    
    // Funciones de actualización
    updateItems,
    updateShippingAddress,
    updateBillingAddress,
    updateDiscountCode,
    updateNotes,
    
    // Estado del carrito
    lastOrder,
    hasItems: cart.items.length > 0,
    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: cart.total
  }
}