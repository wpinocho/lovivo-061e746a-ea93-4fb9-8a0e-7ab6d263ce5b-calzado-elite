import React, { useMemo, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { callEdge } from "@/lib/edge"
import { STORE_ID, STRIPE_PUBLISHABLE_KEY } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { useCart } from "@/contexts/CartContext"
import { useCheckoutState } from "@/hooks/useCheckoutState"
import { useSettings } from "@/contexts/SettingsContext"
import { trackPurchase, tracking } from "@/lib/tracking-utils"

interface StripePaymentProps {
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

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

function PaymentForm({
  amountCents,
  currency = "usd",
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
}: StripePaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { updateOrderCache, getFreshOrder, getOrderSnapshot } = useCheckoutState()
  const { currencyCode } = useSettings()

  const amountLabel = useMemo(() => {
    const amt = (amountCents || 0) / 100
    const cur = (currency || "usd").toUpperCase()
    return `${cur} $${amt.toFixed(2)}`
  }, [amountCents, currency])

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

  const handleFinalizarCompra = async () => {
    if (!stripe || !elements) {
      toast({ title: "Error", description: "Stripe is not ready", variant: "destructive" })
      return
    }
    
    // Validar campos requeridos antes de procesar el pago
    if (onValidationRequired && !onValidationRequired()) {
      return
    }
    
    const card = elements.getElement(CardElement)
    if (!card) {
      toast({ title: "Error", description: "Ingresa los datos de tu tarjeta", variant: "destructive" })
      return
    }
    
    // Validation for pickup mode
    if (deliveryExpectations?.[0]?.type === "pickup" && (!pickupLocations || pickupLocations.length === 0)) {
      toast({ 
        title: "Punto de recogida requerido", 
        description: "Por favor selecciona un punto de recogida antes de continuar.", 
        variant: "destructive" 
      })
      return
    }

    try {
      setLoading(true)

      // Prefer backend order items when available to avoid stale UI
      const sourceOrder = (typeof getFreshOrder === 'function' ? getFreshOrder() : null) || (typeof getOrderSnapshot === 'function' ? getOrderSnapshot() : null)

      // Build a normalized items list prioritizing backend order items
      const rawItems: any[] = (Array.isArray(items) && items.length > 0)
        ? items
        : (sourceOrder && Array.isArray(sourceOrder.order_items) ? sourceOrder.order_items : [])

      const normalizedItems = rawItems.map((it: any) => ({
        product_id: it.product_id || it.product?.id || '',
        variant_id: it.variant_id || it.variant?.id,
        quantity: Number(it.quantity ?? 0),
        price: Number(it.variant_price ?? it.variant?.price ?? it.price ?? it.unit_price ?? 0)
      }))

      // Filter zero/invalid and deduplicate by product_id+variant_id
      const seen = new Set<string>()
      const paymentItems = normalizedItems.filter((it: any) => it.product_id && it.quantity > 0).filter((it: any) => {
        const key = `${it.product_id}:${it.variant_id ?? ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Debug logging for total amount calculation
      console.log('🔍 StripePayment Debug:')
      console.log('sourceOrder:', sourceOrder)
      console.log('UI amountCents prop:', amountCents)
      console.log('UI items (from props):', items)
      console.log('Raw items selected:', rawItems)
      console.log('Normalized items:', normalizedItems)
      console.log('Filtered paymentItems (deduped):', paymentItems)

      // Calculate total in cents from UI amount (what user sees on button)
      const totalCents = Math.max(0, Math.floor(amountCents || 0))
      console.log('totalCents (from UI):', totalCents)

      console.log('📦 Items used for payment:', paymentItems.map((it: any) => ({ key: `${(it.product_id || it.product?.id) ?? ''}${(it.variant_id || it.variant?.id) ? `:${it.variant_id || it.variant?.id}` : ''}`, product_id: it.product_id || it.product?.id, variant_id: it.variant_id || it.variant?.id, quantity: it.quantity })))

      const payload = {
        store_id: STORE_ID,
        order_id: orderId,
        checkout_token: checkoutToken,
        amount: totalCents,
        currency: currency || "mxn",
        expected_total: expectedTotal || totalCents,
        delivery_fee: deliveryFee,
        description: description || `Pedido #${orderId ?? "s/n"}`,
        metadata: { order_id: orderId ?? "", ...(metadata || {}) },
        receipt_email: email,
        customer: {
          email,
          name,
          phone,
        },
        capture_method: "automatic",
        use_stripe_connect: true,
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
          // Incluir discount_code si existe
          ...(metadata?.discount_code ? { discount_code: metadata.discount_code } : {})
        },
        // Handle pickup vs delivery logic
        ...(pickupLocations && pickupLocations.length === 1 ? {
          // Pickup mode: add delivery_method and pickup location
          delivery_method: "pickup",
          pickup_locations: pickupLocations.map(loc => ({
            id: loc.id || loc.name,
            name: loc.name || "",
            address: `${loc.line1 || ""}, ${loc.city || ""}, ${loc.state || ""}, ${loc.country || ""}`,
            hours: loc.schedule || ""
          }))
          // No delivery_expectations for pickup
        } : deliveryExpectations && deliveryExpectations.length > 0 && deliveryExpectations[0]?.type !== "pickup" ? {
          // Delivery mode: add delivery expectations
          delivery_expectations: deliveryExpectations.map((exp: any) => ({
            type: exp.type || "standard_delivery",
            description: exp.description || "",
            ...(exp.price !== undefined ? { estimated_days: "3-5" } : {})
          }))
          // No pickup_locations for delivery
        } : {})
      }

      console.log('🔍 Final delivery/pickup data:', {
        hasPickupLocations: pickupLocations?.length,
        pickupLocations,
        deliveryExpectations,
        isPickupMode: pickupLocations?.length === 1,
        shippingAddress: payload.validation_data?.shipping_address ? 'present' : 'null'
      })
      console.log('🔍 StripePayment payload sent:', JSON.stringify(payload, null, 2))
      const data = await callEdge("payments-create-intent", payload)

      // Handle defensive case if backend returns updated order with unavailable_items in a 200
      if (data?.unavailable_items && data.unavailable_items.length > 0) {
        const unavailableNames = data.unavailable_items.map((item: any) =>
          item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name
        ).join(', ')

        toast({
          title: "Items Out of Stock",
          description: `The following items are out of stock: ${unavailableNames}. Please remove them from your cart to complete your order.`,
          variant: "destructive"
        })

        // Update cache with backend response (backend already filtered out unavailable items)
        updateOrderCache(normalizeOrderFromResponse(data))
        return
      }


      const client_secret = data?.client_secret
      if (!client_secret) {
        throw new Error("No se recibió client_secret del servidor")
      }

      console.log("Client secret recibido, confirmando pago...")
      console.log("Client secret:", client_secret)

      // Con Destination Charges siempre usamos la misma instancia de Stripe (plataforma)
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card,
          billing_details: {
            email: email || undefined,
            name: name || undefined,
            phone: phone || undefined,
          },
        },
      })

      if (result.error) {
        console.error("Error confirmando pago:", result.error)
        toast({ 
          title: "Payment failed", 
          description: result.error.message || "Error processing payment", 
          variant: "destructive" 
        })
        return
      }

      if (result.paymentIntent?.status === "succeeded") {
        // Track Purchase event with proper formatting
        trackPurchase({
          products: paymentItems.map((item: any) => tracking.createTrackingProduct({
            id: item.product_id,
            title: item.product_name || item.title,
            price: item.price / 100, // Convert from cents
            category: 'product',
            variant: item.variant_id ? { id: item.variant_id } : undefined
          })),
          value: totalCents / 100, // Convert from cents
          currency: tracking.getCurrencyFromSettings(currency),
          order_id: orderId,
          custom_parameters: {
            payment_method: 'stripe',
            checkout_token: checkoutToken
          }
        })
        
        // Limpiar carrito
        clearCart()
        
        // Save order details to localStorage for thank you page
        if (data?.order) {
          localStorage.setItem('completed_order', JSON.stringify(data.order))
        }
        
        // Redirigir a thank you page
        navigate(`/thank-you/${orderId}`)
        
        toast({ 
          title: "Payment successful!", 
          description: "Your purchase has been processed successfully." 
        })
      } else {
        toast({ 
          title: "Payment status", 
          description: `Status: ${result.paymentIntent?.status ?? "unknown"}` 
        })
      }
    } catch (err: any) {
      console.error("Error en el proceso de pago:", err)

      // Try to parse structured error from Edge Function (contains unavailable_items and updated order)
      const message = err?.message || ""
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
              title: "Items Out of Stock",
              description: `The following items are out of stock: ${unavailableNames}. Please remove them from your cart to complete your order.`,
              variant: "destructive"
            })

            // Update cache with backend response (backend already filtered out unavailable items)
            updateOrderCache(normalizeOrderFromResponse(parsed))

            setLoading(false)
            return
          }
        } catch (parseErr) {
          console.warn("Failed to parse error JSON from edge response:", parseErr)
        }
      }
      
      // Fallback generic error
      let errorMessage = "No se pudo procesar el pago"
      if (err?.message) errorMessage = err.message
      else if (typeof err === 'string') errorMessage = err
      else if (err?.error) errorMessage = err.error

      toast({ 
        title: "Error de pago", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Security information */}
      <div className="text-sm text-muted-foreground text-center">
        🔒 All transactions are secure and encrypted.
      </div>

      {/* Sección de pago con tarjeta */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary"></div>
              <span className="font-medium">Tarjeta de crédito</span>
            </div>
            <img src="/lovable-uploads/43c70209-0949-4d87-9c23-50bea4ff2d48.png" alt="Tarjetas aceptadas" className="h-6" />
          </div>

          {/* Formulario de tarjeta */}
          <div className="border rounded-lg p-4 bg-background">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                hidePostalCode: false,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón de finalizar compra */}
      <Button 
        onClick={handleFinalizarCompra} 
        disabled={!stripe || loading || !amountCents}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processing...</span>
          </div>
        ) : (
          `Complete Purchase - ${amountLabel}`
        )}
      </Button>

      <div className="text-xs text-muted-foreground text-center">
        By clicking "Complete Purchase", you accept our terms and conditions.
      </div>
    </div>
  )
}

export default function StripePayment(props: StripePaymentProps) {
  if (!stripePromise) {
    return (
      <div className="text-sm text-muted-foreground">
        Error: No se pudo cargar Stripe. Verifica tu configuración.
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  )
}
