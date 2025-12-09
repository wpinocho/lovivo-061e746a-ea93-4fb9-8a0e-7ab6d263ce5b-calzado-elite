import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { EcommerceTemplate } from "@/templates/EcommerceTemplate"
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { formatMoney } from "@/lib/money"

/**
 * EDITABLE UI COMPONENT - CartUI
 * 
 * Este componente solo maneja la presentación del carrito.
 * Recibe toda la lógica como props del HeadlessCart.
 * 
 * PUEDES MODIFICAR LIBREMENTE:
 * - Colores, temas, estilos
 * - Textos e idioma
 * - Layout y estructura visual
 * - Animaciones y efectos
 * - Agregar features visuales (confetti, etc.)
 */

interface CartUIProps {
  logic: {
    // Estado del carrito
    items: any[]
    total: number
    itemCount: number
    isEmpty: boolean
    
    // Acciones del carrito
    updateQuantity: (key: string, quantity: number) => void
    removeItem: (key: string) => void
    
    // Navegación y checkout
    handleCreateCheckout: () => void
    handleNavigateHome: () => void
    handleNavigateBack: () => void
    
    // Estados de carga
    isCreatingOrder: boolean
    
    // Configuración
    currencyCode: string
    
    // Eventos para features adicionales
    onCheckoutStart: () => void
    onCheckoutComplete: () => void
  }
}

export const CartUI = ({ logic }: CartUIProps) => {
  return (
    <EcommerceTemplate 
      pageTitle="Your Cart"
      showCart={false}
    >
      <div className="max-w-6xl mx-auto">
        {logic.isEmpty ? (
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-4">
              Your cart is empty
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Add some products to start your purchase
            </p>
            <Button onClick={logic.handleNavigateHome} size="lg">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Products ({logic.itemCount})
                </h2>
                <Button
                  variant="ghost"
                  onClick={logic.handleNavigateBack}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Continue shopping
                </Button>
              </div>
              
              {logic.items.map((item) => (
                <Card key={item.key}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Product Image */}
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.images && item.product.images.length > 0 || item.variant?.image ? (
                          <img
                            src={item.variant?.image || item.product.images![0]}
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            No image
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-2">
                          {item.product.title}
                        </h3>
                        {item.variant?.title && (
                          <p className="text-muted-foreground mb-3">
                            {item.variant.title}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => logic.updateQuantity(item.key, item.quantity - 1)}
                              className="h-9 w-9"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-medium text-lg px-3">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => logic.updateQuantity(item.key, item.quantity + 1)}
                              className="h-9 w-9"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Price and Remove */}
                          <div className="text-right">
                            <div className="font-bold text-lg mb-2">
                              {formatMoney(
                                ((item.variant?.price ?? item.product.price) || 0) * item.quantity,
                                logic.currencyCode
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => logic.removeItem(item.key)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
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
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal ({logic.itemCount} items)</span>
                        <span>{formatMoney(logic.total, logic.currencyCode)}</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatMoney(logic.total, logic.currencyCode)}</span>
                    </div>

                    <div className="space-y-3 pt-4">
                      <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={() => {
                          logic.onCheckoutStart()
                          logic.handleCreateCheckout()
                        }}
                        disabled={logic.isCreatingOrder}
                      >
                        {logic.isCreatingOrder ? 'Processing...' : 'Checkout'}
                      </Button>

                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={logic.handleNavigateHome}
                      >
                        Continue Shopping
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </EcommerceTemplate>
  )
}