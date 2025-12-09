import { useState, useEffect, useCallback } from 'react'
import { STORE_ID } from '@/lib/config'
import { logger } from '@/lib/logger'

export interface CheckoutState {
  order_id: string
  checkout_token: string
  store_id: string
  updatedAt: number
  discount_code?: string
  // Cache de la orden completa
  order?: {
    id: string
    store_id: string
    customer_id?: string
    order_number: string
    subtotal: number
    tax_amount: number
    shipping_amount: number
    discount_amount: number
    total_amount: number
    shipping_address?: any
    billing_address?: any
    notes?: string
    discount_code?: string
    currency_code: string
    status: string
    checkout_token: string
    created_at: string
    updated_at: string
    order_items: any[]
  }
}

const CHECKOUT_STORAGE_KEY = `checkout:${STORE_ID}`

export const useCheckoutState = () => {
  const [checkoutState, setCheckoutState] = useState<CheckoutState | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    logger.debug('useCheckoutState: Loading from localStorage...');
    try {
      const stored = localStorage.getItem(CHECKOUT_STORAGE_KEY)
      logger.debug('useCheckoutState: Stored data:', stored);
      if (stored) {
        const parsed = JSON.parse(stored) as CheckoutState
        logger.debug('useCheckoutState: Parsed data:', parsed);
        // Validate that we have the required fields
        if (parsed.order_id && parsed.checkout_token) {
          logger.debug('useCheckoutState: Valid checkout state found');
          setCheckoutState(parsed)
        } else {
          logger.debug('useCheckoutState: Invalid checkout state, cleaning up');
          // Clean up invalid data
          localStorage.removeItem(CHECKOUT_STORAGE_KEY)
        }
      } else {
        logger.debug('useCheckoutState: No stored checkout state');
      }
    } catch (error) {
      logger.error('Error loading checkout state from localStorage:', error)
      localStorage.removeItem(CHECKOUT_STORAGE_KEY)
    } finally {
      logger.debug('useCheckoutState: Initialization complete');
      setIsInitialized(true)
    }
  }, [])

  const saveCheckoutState = (newState: Omit<CheckoutState, 'updatedAt'>) => {
    const stateWithTimestamp: CheckoutState = {
      ...newState,
      updatedAt: Date.now()
    }
    
    try {
      localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(stateWithTimestamp))
      setCheckoutState(stateWithTimestamp)
    } catch (error) {
      console.error('Error saving checkout state to localStorage:', error)
    }
  }

  const updateOrderCache = useCallback((orderData: any) => {
    setCheckoutState(prev => {
      if (!prev) return null
      const updatedState: CheckoutState = {
        ...prev,
        order: orderData,
        updatedAt: Date.now()
      }
      
      try {
        localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(updatedState))
        // Notify app that checkout order has been updated (same-tab listeners)
        try {
          window.dispatchEvent(new CustomEvent('checkout:updated', { detail: orderData }))
        } catch {}
        return updatedState
      } catch (error) {
        logger.error('Error updating order cache:', error)
        return prev
      }
    })
  }, [])

  // Always return stale data for immediate display (snapshot)
  const getOrderSnapshot = () => {
    return checkoutState?.order || null
  }

  // Only return fresh data within TTL, null if expired (needs revalidation)
  const getFreshOrder = () => {
    if (!checkoutState?.order) return null
    
    // Soft TTL: 15 minutes - data is considered fresh
    const cacheAge = Date.now() - checkoutState.updatedAt
    const FRESH_TTL = 15 * 60 * 1000 // 15 minutes
    
    return cacheAge < FRESH_TTL ? checkoutState.order : null
  }

  // Check if data is stale but still usable
  const isOrderStale = () => {
    if (!checkoutState?.order) return false
    
    const cacheAge = Date.now() - checkoutState.updatedAt
    const FRESH_TTL = 15 * 60 * 1000 // 15 minutes
    const HARD_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
    
    return cacheAge >= FRESH_TTL && cacheAge < HARD_TTL
  }

  const updateDiscountCode = (discountCode: string | null) => {
    setCheckoutState(prev => {
      if (!prev) return null
      const updatedState: CheckoutState = {
        ...prev,
        discount_code: discountCode || undefined,
        updatedAt: Date.now()
      }
      
      try {
        localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(updatedState))
        return updatedState
      } catch (error) {
        logger.error('Error updating discount code in state:', error)
        return prev
      }
    })
  }

  const getCurrentDiscountCode = () => {
    console.log('🔍 getCurrentDiscountCode - checkoutState:', {
      discount_code: checkoutState?.discount_code,
      order_discount_code: checkoutState?.order?.discount_code,
      has_checkout_state: !!checkoutState,
      has_order: !!checkoutState?.order
    })
    
    // First try from state
    if (checkoutState?.discount_code) {
      console.log('✅ Using discount_code from state:', checkoutState.discount_code)
      return checkoutState.discount_code
    }
    
    // Fallback to cached order
    const fallbackCode = checkoutState?.order?.discount_code || null
    console.log('📄 Using fallback discount_code from order:', fallbackCode)
    return fallbackCode
  }

  const clearCheckoutState = () => {
    try {
      localStorage.removeItem(CHECKOUT_STORAGE_KEY)
      setCheckoutState(null)
    } catch (error) {
      console.error('Error clearing checkout state from localStorage:', error)
    }
  }

  const hasActiveCheckout = checkoutState && 
    checkoutState.order_id && 
    checkoutState.checkout_token &&
    // Check if checkout is not too old (7 days - extended from 24 hours)
    (Date.now() - checkoutState.updatedAt) < 7 * 24 * 60 * 60 * 1000

  return {
    checkoutState,
    saveCheckoutState,
    clearCheckoutState,
    updateOrderCache,
    updateDiscountCode,
    getCurrentDiscountCode,
    getOrderSnapshot, // Always returns stale data for immediate display
    getFreshOrder,    // Only returns fresh data, null if needs revalidation
    isOrderStale,     // Checks if data is stale but still usable
    hasActiveCheckout: Boolean(hasActiveCheckout),
    isInitialized,
    orderId: checkoutState?.order_id,
    checkoutToken: checkoutState?.checkout_token
  }
}