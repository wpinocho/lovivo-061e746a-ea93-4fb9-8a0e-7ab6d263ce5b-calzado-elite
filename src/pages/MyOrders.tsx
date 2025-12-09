import { useAuth } from '@/hooks/useAuth'
import MyOrdersUI from '@/pages/ui/MyOrdersUI'

/**
 * ROUTE COMPONENT - MyOrders
 * TIPO A - Solo ruta
 * Shows order history - displays login prompt if not authenticated
 */

const MyOrders = () => {
  const { user, loading } = useAuth()

  return <MyOrdersUI user={user} authLoading={loading} />
}

export default MyOrders
