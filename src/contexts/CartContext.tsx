import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import type { Product, ProductVariant } from '@/lib/supabase'

export interface CartItem {
  key: string
  product: Product
  variant?: ProductVariant
  quantity: number
}

interface CartState {
  items: CartItem[]
  total: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; variant?: ProductVariant } }
  | { type: 'REMOVE_ITEM'; payload: string } // key
  | { type: 'UPDATE_QUANTITY'; payload: { key: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartState }

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, variant } = action.payload
      const key = `${product.id}${variant ? `:${variant.id}` : ''}`

      const existingItem = state.items.find(item => item.key === key)
      
      let newItems: CartItem[]
      if (existingItem) {
        newItems = state.items.map(item =>
          item.key === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        newItems = [...state.items, { key, product, variant, quantity: 1 }]
      }
      
      const total = newItems.reduce((sum, item) => {
        const unit = item.variant?.price ?? item.product.price ?? 0
        return sum + unit * item.quantity
      }, 0)
      return { items: newItems, total }
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.key !== action.payload)
      const total = newItems.reduce((sum, item) => {
        const unit = item.variant?.price ?? item.product.price ?? 0
        return sum + unit * item.quantity
      }, 0)
      return { items: newItems, total }
    }
    
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: action.payload.key })
      }
      
      const newItems = state.items.map(item =>
        item.key === action.payload.key
          ? { ...item, quantity: action.payload.quantity }
          : item
      )
      const total = newItems.reduce((sum, item) => {
        const unit = item.variant?.price ?? item.product.price ?? 0
        return sum + unit * item.quantity
      }, 0)
      return { items: newItems, total }
    }
    
    case 'CLEAR_CART':
      return { items: [], total: 0 }
    
    case 'SET_CART':
      return action.payload
    
    default:
      return state
  }
}

interface CartContextType {
  state: CartState
  addItem: (product: Product, variant?: ProductVariant) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  // SEPARACIÓN: Ya no exponemos setCheckoutUpdateFunction
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'cart-state'

const initializeCartFromStorage = (): CartState => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error)
  }
  return { items: [], total: 0 }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initializeCartFromStorage())
  // SEPARACIÓN: Ya no manejamos checkoutUpdateFunction

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }, [state])

  // Listen for storage changes (for cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue)
          dispatch({ type: 'SET_CART', payload: newState })
        } catch (error) {
          console.error('Error parsing cart from storage event:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const addItem = (product: Product, variant?: ProductVariant) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, variant } })
  }

  const removeItem = (key: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: key })
  }

  const updateQuantity = (key: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { key, quantity } })
  }

  // SEPARACIÓN: El carrito ya no se sincroniza automáticamente con checkout-update
  // Solo maneja productos antes del checkout

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error)
    }
  }

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}