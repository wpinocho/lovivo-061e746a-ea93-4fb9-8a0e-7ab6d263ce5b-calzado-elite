import React, { useState } from "react"
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { callEdge } from "@/lib/edge"
import { STORE_ID, PAYPAL_CLIENT_ID } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { useCart } from "@/contexts/CartContext"
import { useCheckoutState } from "@/hooks/useCheckoutState"
import { useSettings } from "@/contexts/SettingsContext"
import { trackPurchase, tracking } from "@/lib/tracking-utils"

interface PayPalPaymentProps {
  amountCents: number
  currency?: string
  description?: string
  metadata?: Record<string, string>
  email?: string
  name?: string
  phone?: string
  orderId?: string
  checkoutToken?: string
  onValidationRequired?: () => boolean
  expectedTotal?: number
  deliveryFee?: number
  shippingAddress?: any
  billingAddress?: any
  items?: any[]
  deliveryExpectations?: any[]
  pickupLocations?: any[]
}

function PaymentForm({
  amountCents,
  currency = "mxn",
  description,
  metadata,
  email,
  name,
  phone,
  orderId,
  checkoutToken,
  onValidationRequired,
  expectedTotal,
  deliveryFee = 0,
  shippingAddress,
  billingAddress,
  items = [],
  deliveryExpectations = [],
  pickupLocations = [],
}: PayPalPaymentProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { updateOrderCache, getFreshOrder, getOrderSnapshot } = useCheckoutState()
  const { currencyCode } = useSettings()

  const amount = ((amountCents || 0) / 100).toFixed(2)

  // Normalize edge response into an order-like object for our cache
  const normalizeOrderFromResponse = (resp: any) => {
    if (resp?.order) return resp.order
    return {
      id: resp?.order_id ?? orderId,
      store_id: STORE_ID,
      checkout_token: resp?.checkout_token ?? checkoutToken,
      currency_code: resp?.currency_code,
      subtotal: resp?.subtotal,
      discount_amount: resp?.discount_amount,
      total_amount: resp?.total_amount,
      order_items: Array.isArray(resp?.order_items) ? resp.order_items : []
    }
  }

  const createOrder = async (data: any, actions: any) => {
    // Validar campos requeridos antes de procesar el pago
    if (onValidationRequired && !onValidationRequired()) {
      throw new Error('Por favor completa todos los campos requeridos')
    }

    // Validation for pickup mode
    if (deliveryExpectations?.[0]?.type === "pickup" && (!pickupLocations || pickupLocations.length === 0)) {
      toast({ 
        title: "Punto de recogida requerido", 
        description: "Por favor selecciona un punto de recogida antes de continuar.", 
        variant: "destructive" 
      })
      throw new Error('Pickup location required')
    }

    // Create PayPal order
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: amount,
            currency_code: currency.toUpperCase(),
          },
          description: description || `Pedido #${orderId ?? "s/n"}`,
        },
      ],
    })
  }

  const onApprove = async (data: any, actions: any) => {
    setLoading(true)
    try {
      // Capture the PayPal payment
      const details = await actions.order.capture()
      
      // Get source order items
      const sourceOrder = (typeof getFreshOrder === 'function' ? getFreshOrder() : null) || (typeof getOrderSnapshot === 'function' ? getOrderSnapshot() : null)
      
      const rawItems: any[] = (Array.isArray(items) && items.length > 0)
        ? items
        : (sourceOrder && Array.isArray(sourceOrder.order_items) ? sourceOrder.order_items : [])

      const normalizedItems = rawItems.map((it: any) => ({
        product_id: it.product_id || it.product?.id || '',
        variant_id: it.variant_id || it.variant?.id,
        quantity: Number(it.quantity ?? 0),
        price: Number(it.variant_price ?? it.variant?.price ?? it.price ?? it.unit_price ?? 0)
      }))

      const seen = new Set<string>()
      const paymentItems = normalizedItems.filter((it: any) => it.product_id && it.quantity > 0).filter((it: any) => {
        const key = `${it.product_id}:${it.variant_id ?? ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Process order with backend
      const totalCents = Math.max(0, Math.floor(amountCents || 0))
      
      const payload = {
        store_id: STORE_ID,
        order_id: orderId,
        checkout_token: checkoutToken,
        amount: totalCents,
        currency: currency || "mxn",
        expected_total: expectedTotal || totalCents,
        delivery_fee: deliveryFee,
        description: description || `Pedido #${orderId ?? "s/n"}`,
        metadata: { 
          order_id: orderId ?? "", 
          payment_method: 'paypal',
          paypal_order_id: data.orderID,
          paypal_payer_id: data.payerID,
          ...(metadata || {}) 
        },
        receipt_email: email,
        customer: {
          email,
          name,
          phone,
        },
        validation_data: {
          shipping_address: shippingAddress ? {
            line1: shippingAddress.line1 || "",
            line2: shippingAddress.line2 || "",
            city: shippingAddress.city || "",
            state: shippingAddress.state || "",
            postal_code: shippingAddress.postal_code || "",
            country: shippingAddress.country || "",
            name: `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim()
          } : null,
          billing_address: billingAddress ? {
            line1: billingAddress.line1 || "",
            line2: billingAddress.line2 || "",
            city: billingAddress.city || "",
            state: billingAddress.state || "",
            postal_code: billingAddress.postal_code || "",
            country: billingAddress.country || "",
            name: `${billingAddress.first_name || ""} ${billingAddress.last_name || ""}`.trim()
          } : null,
          items: paymentItems.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            ...(item.variant_id ? { variant_id: item.variant_id } : {}),
            price: Math.max(0, Math.round(Number(item.price) * 100))
          })),
          ...(metadata?.discount_code ? { discount_code: metadata.discount_code } : {})
        },
        ...(pickupLocations && pickupLocations.length === 1 ? {
          delivery_method: "pickup",
          pickup_locations: pickupLocations.map(loc => ({
            id: loc.id || loc.name,
            name: loc.name || "",
            address: `${loc.line1 || ""}, ${loc.city || ""}, ${loc.state || ""}, ${loc.country || ""}`,
            hours: loc.schedule || ""
          }))
        } : deliveryExpectations && deliveryExpectations.length > 0 && deliveryExpectations[0]?.type !== "pickup" ? {
          delivery_expectations: deliveryExpectations.map((exp: any) => ({
            type: exp.type || "standard_delivery",
            description: exp.description || "",
            ...(exp.price !== undefined ? { estimated_days: "3-5" } : {})
          }))
        } : {})
      }

      // Track Purchase event
      trackPurchase({
        products: paymentItems.map((item: any) => tracking.createTrackingProduct({
          id: item.product_id,
          title: item.product_name || item.title,
          price: item.price / 100,
          category: 'product',
          variant: item.variant_id ? { id: item.variant_id } : undefined
        })),
        value: totalCents / 100,
        currency: tracking.getCurrencyFromSettings(currency),
        order_id: orderId,
        custom_parameters: {
          payment_method: 'paypal',
          checkout_token: checkoutToken,
          paypal_order_id: data.orderID
        }
      })

      // Clear cart
      clearCart()

      // Save order details to localStorage for thank you page
      if (details) {
        localStorage.setItem('completed_order', JSON.stringify({
          ...details,
          order_id: orderId
        }))
      }

      // Navigate to thank you page
      navigate(`/thank-you/${orderId}`)

      toast({
        title: "¡Pago exitoso!",
        description: "Tu compra ha sido procesada correctamente con PayPal."
      })
    } catch (error: any) {
      console.error("Error procesando pago PayPal:", error)
      
      const message = error?.message || ""
      const jsonStart = message.indexOf("{")
      const jsonEnd = message.lastIndexOf("}")
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          const parsed = JSON.parse(message.slice(jsonStart, jsonEnd + 1))

          if (parsed?.unavailable_items && parsed.unavailable_items.length > 0) {
            const unavailableNames = parsed.unavailable_items.map((item: any) =>
              item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name
            ).join(', ')

            toast({
              title: "Items sin stock",
              description: `Los siguientes items no tienen stock: ${unavailableNames}. Por favor elimínalos del carrito.`,
              variant: "destructive"
            })

            updateOrderCache(normalizeOrderFromResponse(parsed))
            setLoading(false)
            return
          }
        } catch (parseErr) {
          console.warn("Failed to parse error JSON:", parseErr)
        }
      }

      toast({
        title: "Error de pago",
        description: error.message || "No se pudo procesar el pago con PayPal",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const onError = (err: any) => {
    console.error("PayPal error:", err)
    toast({
      title: "Error de PayPal",
      description: "Hubo un problema al procesar el pago. Por favor intenta nuevamente.",
      variant: "destructive"
    })
  }

  return (
    <div className="space-y-6">
      {/* Security information */}
      <div className="text-sm text-muted-foreground text-center">
        🔒 Todas las transacciones son seguras y encriptadas.
      </div>

      {/* PayPal Payment Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary"></div>
              <span className="font-medium">PayPal</span>
            </div>
            <img src="https://www.paypalobjects.com/webstatic/mktg/logo/AM_mc_vs_dc_ae.jpg" alt="PayPal" className="h-6" />
          </div>

          {/* PayPal Buttons */}
          <div className="space-y-4">
            {loading ? (
              <Button 
                disabled 
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Procesando...</span>
                </div>
              </Button>
            ) : (
              <PayPalButtons
                style={{ 
                  layout: "vertical",
                  color: "gold",
                  shape: "rect",
                  label: "pay"
                }}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
                disabled={!amountCents || loading}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        Al hacer clic en "Pagar con PayPal", aceptas nuestros términos y condiciones.
      </div>
    </div>
  )
}

export default function PayPalPayment(props: PayPalPaymentProps) {
  if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'TU_CLIENT_ID_DE_PAYPAL') {
    return (
      <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
        ⚠️ PayPal no está configurado. Por favor agrega tu Client ID en src/lib/config.ts
      </div>
    )
  }

  return (
    <PayPalScriptProvider options={{ 
      clientId: PAYPAL_CLIENT_ID,
      currency: (props.currency || "mxn").toUpperCase(),
      intent: "capture"
    }}>
      <PaymentForm {...props} />
    </PayPalScriptProvider>
  )
}