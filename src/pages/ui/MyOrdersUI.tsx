/**
 * EDITABLE UI COMPONENT - MyOrdersUI
 * TIPO B - El agente de IA puede editar libremente este componente
 */

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { EcommerceTemplate } from '@/templates/EcommerceTemplate'
import { HeadlessMyOrders } from '@/components/headless/HeadlessMyOrders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthDialog } from '@/components/AuthDialog'
import { Package, Calendar, DollarSign, RefreshCw, ShoppingBag, AlertCircle, LogIn } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

interface MyOrdersUIProps {
  user: User | null
  authLoading: boolean
}

export default function MyOrdersUI({ user, authLoading }: MyOrdersUIProps) {
  const navigate = useNavigate()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  return (
    <EcommerceTemplate layout="centered">
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground mt-2">
            Here you can see the history of all your orders
          </p>
        </div>

        {authLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/4 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !user ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-6">
                    <LogIn className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-xl">Sign in required</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    You need to sign in to your account to view your order history.
                  </p>
                </div>
                <Button 
                  size="lg"
                  onClick={() => setShowAuthDialog(true)}
                  className="mt-4"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <HeadlessMyOrders>
            {({ orders, loading, error, refetch }) => {
              if (loading) {
              return (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/4 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            }

            if (error) {
              const isColumnError = error.includes('column') || error.includes('does not exist')
              
              return (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-8 pb-8">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Unable to load orders</h3>
                        <p className="text-muted-foreground mt-2">
                          {isColumnError 
                            ? "There's a configuration issue. Please contact support."
                            : "We couldn't load your orders. Please try again."}
                        </p>
                      </div>
                      <Button onClick={refetch} variant="outline" size="lg">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            if (orders.length === 0) {
              return (
                <Card className="border-dashed">
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center space-y-6">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-muted p-6">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-xl">No orders yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          You haven't placed any orders yet. Start shopping and your order history will appear here.
                        </p>
                      </div>
                      <Button 
                        size="lg"
                        onClick={() => navigate('/')}
                        className="mt-4"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Start Shopping
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            return (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Order #{order.order_number || order.id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(order.created_at), 'MMMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatMoney(order.total_amount || 0, order.currency_code || 'USD')}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status === 'completed' ? 'Completed' : order.status === 'pending' ? 'Pending' : 'Processing'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Order status:</span>
                          <span className="font-medium capitalize">{order.status || 'Processing'}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium">{formatMoney(order.subtotal, order.currency_code)}</span>
                        </div>
                        
                        {order.discount_amount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount:</span>
                            <span className="font-medium text-green-600">-{formatMoney(order.discount_amount, order.currency_code)}</span>
                          </div>
                        )}

                        {order.shipping_address && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping:</span>
                            <span className="font-medium text-right">
                              {typeof order.shipping_address === 'string' 
                                ? order.shipping_address 
                                : `${order.shipping_address.city}, ${order.shipping_address.country}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
            }}
          </HeadlessMyOrders>
        )}
      </div>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </EcommerceTemplate>
  )
}
