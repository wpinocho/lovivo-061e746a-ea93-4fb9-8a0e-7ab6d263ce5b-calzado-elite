import { useCart } from "@/contexts/CartContext"
import { useCheckout } from "@/hooks/useCheckout"
import { useSettings } from "@/contexts/SettingsContext"
import { useNavigate } from "react-router-dom"

/**
 * FORBIDDEN ADAPTER - CartAdapter
 * 
 * Este adaptador expone toda la lógica del carrito de forma controlada.
 * Los componentes de UI solo pueden consumir estos métodos, no modificar la lógica interna.
 */
export const useCartLogic = () => {
  const { state, updateQuantity, removeItem } = useCart()
  const navigate = useNavigate()
  const { checkout, isLoading: isCreatingOrder } = useCheckout()
  const { currencyCode } = useSettings()

  const handleCreateCheckout = async () => {
    try {
      console.log('Starting checkout process...')
      const customerInfo = {
        email: 'cliente@demo.com', // Por ahora usando datos de demo
        first_name: 'Cliente',
        last_name: 'Demo'
      }

      // Snapshot del carrito antes de crear la orden (el hook limpia el carrito)
      try {
        sessionStorage.setItem('checkout_cart', JSON.stringify({ items: state.items, total: state.total }))
      } catch {}

      console.log('Calling checkout function...')
      const order = await checkout({
        customerInfo,
        currencyCode: currencyCode
      })

      console.log('Order created:', order)
      console.log('About to save order to sessionStorage...')
      
      // Guardar orden en sessionStorage para la página de checkout
      try {
        sessionStorage.setItem('checkout_order', JSON.stringify(order))
        sessionStorage.setItem('checkout_order_id', String(order.order_id))
        console.log('Order saved to sessionStorage')
      } catch (e) {
        console.error('Error saving to sessionStorage:', e)
      }

      console.log('Navigating to /checkout...')
      navigate('/checkout')
      console.log('Navigation call completed')
    } catch (error) {
      // El error ya es manejado por el hook useCheckout
      console.error('Error in handleCreateCheckout:', error)
    }
  }

  const handleNavigateHome = () => {
    navigate('/')
  }

  const handleNavigateBack = () => {
    navigate('/')
  }

  return {
    // Estado del carrito
    items: state.items,
    total: state.total,
    itemCount: state.items.length,
    isEmpty: state.items.length === 0,
    
    // Acciones del carrito
    updateQuantity,
    removeItem,
    
    // Navegación y checkout
    handleCreateCheckout,
    handleNavigateHome,
    handleNavigateBack,
    
    // Estados de carga
    isCreatingOrder,
    
    // Configuración
    currencyCode,
    
    // Eventos para features adicionales (confetti, etc)
    onCheckoutStart: () => {
      // Hook para features adicionales como confetti
      console.log('Checkout started - ready for additional features')
    },
    onCheckoutComplete: () => {
      // Hook para tracking adicional, etc
      console.log('Checkout completed - ready for additional tracking')
    }
  }
}