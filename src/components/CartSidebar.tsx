import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/contexts/CartContext"
import { useCheckout } from "@/hooks/useCheckout"
import { useSettings } from "@/contexts/SettingsContext"
import { Minus, Plus, Trash2, ExternalLink } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const CartSidebar = ({ isOpen, onClose }: CartSidebarProps) => {
  const { state, updateQuantity, removeItem, clearCart } = useCart()
  const navigate = useNavigate()
  const { checkout, isLoading: isCreatingOrder } = useCheckout()
  const { currencyCode } = useSettings()

  const handleCreateCheckout = async () => {
    try {
      console.log('Starting checkout process...')

      // Snapshot del carrito antes de crear la orden (el hook limpia el carrito)
      try {
        sessionStorage.setItem('checkout_cart', JSON.stringify({ items: state.items, total: state.total }))
      } catch {}

      console.log('Calling checkout function...')
      const order = await checkout({
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

      console.log('Closing sidebar...')
      onClose()
      
      console.log('Navigating to /checkout...')
      navigate('/checkout')
      console.log('Navigation call completed')
    } catch (error) {
      // El error ya es manejado por el hook useCheckout
      console.error('Error in handleCreateCheckout:', error)
    }
  }

  const finalTotal = state.total

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 p-0" aria-describedby="cart-description">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              Shopping Cart
              <Link to="/cart" onClick={onClose} className="hover:opacity-70 transition-opacity">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </SheetTitle>
            <div id="cart-description" className="sr-only">
              Review and modify the products in your shopping cart
            </div>
          </SheetHeader>

          {state.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Your cart is empty
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add some products to start your purchase
                </p>
                <Button onClick={onClose} variant="outline">
                  Continue Shopping
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {state.items.map((item) => (
                  <Card key={item.key}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                          {item.product.images && item.product.images.length > 0 || item.variant?.image ? (
                            <img
                              src={item.variant?.image || item.product.images![0]}
                              alt={item.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground line-clamp-2">
                            {item.product.title}{item.variant?.title ? ` - ${item.variant.title}` : ''}
                          </h4>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                className="h-7 w-7"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-medium px-2 text-sm">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                className="h-7 w-7"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-semibold text-sm">
                                ${(((item.variant?.price ?? item.product.price) || 0) * item.quantity).toFixed(2)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.key)}
                                className="text-destructive hover:text-destructive p-0 h-auto mt-1"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t p-6">
                <div className="space-y-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  size="lg" 
                  onClick={handleCreateCheckout} 
                  disabled={isCreatingOrder}
                >
                  {isCreatingOrder ? 'Processing...' : 'Checkout'}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}