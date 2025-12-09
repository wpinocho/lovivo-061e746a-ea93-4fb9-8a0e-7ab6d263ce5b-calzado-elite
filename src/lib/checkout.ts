import { supabase, supabaseUrl, supabaseKey, Order } from './supabase'
import { callEdge } from './edge'
import { STORE_ID } from './config'
import type { CartItem } from '@/contexts/CartContext'
import type { CheckoutPayload, CheckoutResponse, CheckoutItem } from './supabase'

export const createCheckoutFromCart = async (
  cartItems: CartItem[],
  customerInfo?: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  },
  discountCode?: string,
  shippingAddress?: any,
  billingAddress?: any,
  notes?: string,
  currencyCode: string = 'USD'
): Promise<CheckoutResponse> => {
  // Get authenticated user if exists
  const { data: { user } } = await supabase.auth.getUser()
  
  if (cartItems.length === 0) {
    throw new Error('El carrito está vacío')
  }

  // Convertir items del carrito al formato esperado por checkout-create
  const items: CheckoutItem[] = cartItems.map(cartItem => ({
    product_id: cartItem.product.id,
    quantity: cartItem.quantity,
    // Solo incluir variant_id si existe una variante seleccionada
    ...(cartItem.variant && { variant_id: cartItem.variant.id })
  }))

  const payload: CheckoutPayload = {
    store_id: STORE_ID,
    items,
    user_id: user?.id, // Link order to authenticated user
    ...(discountCode && { discount_code: discountCode }),
    ...(customerInfo && { customer: customerInfo }),
    ...(shippingAddress && { shipping_address: shippingAddress }),
    ...(billingAddress && { billing_address: billingAddress }),
    ...(notes && { notes }),
    currency_code: currencyCode
  }

  try {
    return await callEdge('checkout-create', payload)
  } catch (error) {
    throw new Error(`Error al crear la orden: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Función de ejemplo para testing rápido
// Tipos para checkout-update
export interface CheckoutUpdatePayload {
  order_id: string
  checkout_token: string
  items?: CheckoutItem[]
  discount_code?: string | null
  shipping_address?: any
  billing_address?: any
  notes?: string | null
  currency_code?: string
  include_product_details?: boolean // Para solicitar datos completos de productos
}

export interface CheckoutUpdateResponse {
  success: true
  order: Order
  shipping_amount?: number
  subtotal?: number
  total_amount?: number
  updated_fields?: string[]
}

// Función para actualizar checkout existente
export const updateCheckout = async (payload: CheckoutUpdatePayload): Promise<CheckoutUpdateResponse> => {
  if (!payload.order_id || !payload.checkout_token) {
    throw new Error('order_id y checkout_token son requeridos')
  }

  try {
    return await callEdge('checkout-update', payload)
  } catch (error) {
    throw new Error(`Error al actualizar la orden: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export const createSampleOrder = async (): Promise<CheckoutResponse> => {
  const payload: CheckoutPayload = {
    store_id: STORE_ID,
    items: [
      // Producto CON variantes → incluir variant_id
      {
        product_id: '2790e602-1f37-43b8-99b6-3d703b81a162',
        quantity: 2,
        variant_id: '99aff621-666f-4a6f-979a-5beb7d4494e8', // Azul / s
      },
      // Producto SIN variantes → no incluir variant_id
      {
        product_id: 'f6e331c8-c0e9-40bb-b15f-c076056f3df2',
        quantity: 1,
      },
    ],
    discount_code: 'SUMMER10',
    customer: { 
      email: 'cliente@demo.com', 
      first_name: 'Cliente', 
      last_name: 'Demo' 
    },
    shipping_address: { 
      line1: 'C/ Gran Vía 1', 
      city: 'Madrid', 
      region: 'Madrid', 
      country: 'ES', 
      postal_code: '28013' 
    },
    billing_address: { 
      line1: 'C/ Gran Vía 1', 
      city: 'Madrid', 
      region: 'Madrid', 
      country: 'ES', 
      postal_code: '28013' 
    },
    notes: 'Entregar por la tarde',
    currency_code: 'USD',
  }

  try {
    return await callEdge('checkout-create', payload)
  } catch (error) {
    throw new Error(`Error al crear la orden: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}