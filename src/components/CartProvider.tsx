import { createContext, useContext, useState, useEffect } from 'react'
import { CartSidebar } from './CartSidebar'

interface CartUIContextType {
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartUIContext = createContext<CartUIContextType | undefined>(undefined)

export const useCartUI = () => {
  const context = useContext(CartUIContext)
  if (!context) {
    throw new Error('useCartUI must be used within a CartUIProvider')
  }
  return context
}

interface CartUIProviderProps {
  children: React.ReactNode
}

export const CartUIProvider = ({ children }: CartUIProviderProps) => {
  const [isCartOpen, setIsCartOpen] = useState(false)

  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)
  const toggleCart = () => setIsCartOpen(!isCartOpen)

  const value = {
    isCartOpen,
    openCart,
    closeCart,
    toggleCart
  }

  return (
    <CartUIContext.Provider value={value}>
      {children}
      <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
    </CartUIContext.Provider>
  )
}