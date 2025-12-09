/**
 * NO EDITAR - Solo referencia para el agente de IA
 * TIPO C - FORBIDDEN ADAPTER
 * 
 * MyOrdersAdapter: Maneja la lógica de obtener órdenes del usuario
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { STORE_ID } from '@/lib/config'
import { useAuth } from '@/hooks/useAuth'
import type { Order } from '@/lib/supabase'

interface UseMyOrdersLogic {
  orders: Order[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useMyOrdersLogic = (): UseMyOrdersLogic => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    if (!user) {
      setOrders([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // ✅ CONSULTA CORRECTA: Sin filtros manuales
      // Las políticas RLS automáticamente filtran por auth.uid()
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              title,
              images
            )
          ),
          customers (
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setOrders(data || [])
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError(err.message || 'Error loading your orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [user])

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders
  }
}
