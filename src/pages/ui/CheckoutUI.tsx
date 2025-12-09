import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, X, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StripePayment from "@/components/StripePayment";
import { CountryPhoneSelect } from "@/components/CountryPhoneSelect";
import { HeadlessCheckout } from "@/components/headless/HeadlessCheckout";
import { useURLCheckoutParams } from "@/hooks/useURLCheckoutParams";

/**
 * EDITABLE UI COMPONENT - CheckoutUI
 * 
 * Este componente solo maneja la presentación del checkout.
 * Toda la lógica viene del HeadlessCheckout.
 * 
 * PUEDES MODIFICAR LIBREMENTE:
 * - Colores, temas, estilos
 * - Textos e idioma
 * - Layout y estructura visual
 * - Formularios y campos
 * - Animaciones y efectos
 * - Agregar features visuales
 */

export default function CheckoutUI() {
  const { params, hasParams } = useURLCheckoutParams();
  const navigate = useNavigate();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <HeadlessCheckout>
      {(logic) => {
        // Aplicar parámetros de URL cuando se monta el componente
        useEffect(() => {
          if (hasParams && params) {
            logic.applyURLParams(params);
          }
        }, [hasParams, params]);

        return (
        <div className="min-h-screen bg-background">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Formulario de Checkout */}
              <div className="space-y-8 bg-card p-6 rounded-lg">
                {/* Contact Section */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">Contact</h2>
                  <div className="space-y-4">
                    <div>
                      <Input 
                        type="email" 
                        value={logic.email} 
                        onChange={e => logic.setEmail(e.target.value)} 
                        onBlur={() => logic.saveClientData(true)} 
                        placeholder="Email address" 
                        className="w-full" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="subscribe" 
                        checked={logic.subscribeNews} 
                        onCheckedChange={checked => logic.setSubscribeNews(checked as boolean)} 
                      />
                      <Label htmlFor="subscribe" className="text-sm">
                        Send me news and offers via email
                      </Label>
                    </div>
                  </div>
                </section>

                {/* Pickup Locations */}
                {logic.pickupLocations && logic.pickupLocations.length > 0 && (
                  <section>
                    <div className="flex items-center space-x-3 mb-4">
                      <input 
                        type="checkbox" 
                        id="use-pickup" 
                        checked={logic.usePickup} 
                        onChange={e => {
                          logic.setUsePickup(e.target.checked);
                          if (!e.target.checked) {
                            logic.setSelectedPickupLocation(null);
                            logic.setShippingCost(0);
                            logic.setSelectedDeliveryMethod(null);
                          }
                        }} 
                        className="w-4 h-4" 
                      />
                      <label htmlFor="use-pickup" className="text-sm font-medium">Store pickup</label>
                    </div>
                    
                    {logic.usePickup && (
                      <div className="space-y-3">
                        {Array.isArray(logic.pickupLocations) && logic.pickupLocations.map((location: any, index: number) => {
                          const isExpanded = logic.selectedPickupLocation?.name === location.name;
                          return (
                            <div key={index} className="border rounded-lg">
                              <label className="flex items-start p-4 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="pickup" 
                                  value={index} 
                                  checked={isExpanded} 
                                  onChange={() => {
                                    if (isExpanded) {
                                      logic.setSelectedPickupLocation(null);
                                      logic.setShippingCost(0);
                                      logic.setSelectedDeliveryMethod(null);
                                    } else {
                                      logic.setSelectedPickupLocation(location);
                                      logic.setShippingCost(0);
                                      logic.setSelectedDeliveryMethod(null);
                                    }
                                  }} 
                                  className="w-4 h-4 mt-1 mr-3" 
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{location.name}</div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {location.line1}{location.line2 && `, ${location.line2}`}, {location.city}, {location.country}
                                  </div>
                                  {!isExpanded && <div className="text-sm text-primary mt-1">See you there</div>}
                                  {isExpanded && (
                                    <>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {location.city}, {location.state}, {location.country} - {location.postal_code}
                                      </div>
                                      {location.schedule && <div className="text-sm text-muted-foreground">Schedule: {location.schedule}</div>}
                                      {location.instructions && <div className="text-sm text-primary mt-1">{location.instructions}</div>}
                                    </>
                                  )}
                                </div>
                                <div className="font-semibold text-green-600">FREE</div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* Delivery Section */}
                {!logic.usePickup && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Delivery</h2>
                    
                    <div className="space-y-4">
                      {/* País/Región */}
                      <div>
                        <Select 
                          value={logic.address.country} 
                          onValueChange={value => {
                            const next = {
                              ...logic.address,
                              country: value
                            };
                            logic.setAddress(next);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Country / Region" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(logic.availableCountries) && logic.availableCountries.length > 0 ? 
                              logic.availableCountries.map((country: any) => (
                                <SelectItem key={country.name} value={country.name}>
                                  {country.name}
                                </SelectItem>
                              )) : (
                                <SelectItem value="México">México</SelectItem>
                              )
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nombre y Apellidos */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input 
                            id="firstName" 
                            value={logic.firstName} 
                            onChange={e => logic.setFirstName(e.target.value)} 
                            onBlur={() => logic.saveClientData(true)} 
                            placeholder="First name" 
                          />
                        </div>
                        <div>
                          <Input 
                            id="lastName" 
                            value={logic.lastName} 
                            onChange={e => logic.setLastName(e.target.value)} 
                            onBlur={() => logic.saveClientData(true)} 
                            placeholder="Last name" 
                          />
                        </div>
                      </div>

                      {/* Dirección */}
                      <div>
                        <Input 
                          id="address" 
                          value={logic.address.line1} 
                          onChange={e => logic.setAddress({
                            ...logic.address,
                            line1: e.target.value
                          })} 
                          placeholder="Address" 
                        />
                      </div>

                      {/* Complemento de dirección */}
                      <div>
                        <Input 
                          value={logic.address.line2} 
                          onChange={e => logic.setAddress({
                            ...logic.address,
                            line2: e.target.value
                          })} 
                          placeholder="Apartment, suite, etc. (optional)" 
                        />
                      </div>

                      {/* Colonia */}
                      <div>
                        <Input id="colonia" placeholder="Neighborhood" />
                      </div>

                      {/* Código postal, Ciudad, Estado */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Input 
                            id="postal" 
                            value={logic.address.postal_code} 
                            onChange={e => logic.setAddress({
                              ...logic.address,
                              postal_code: e.target.value
                            })} 
                            placeholder="Postal code" 
                          />
                        </div>
                        <div>
                          <Input 
                            id="city" 
                            value={logic.address.city} 
                            onChange={e => logic.setAddress({
                              ...logic.address,
                              city: e.target.value
                            })} 
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Select 
                            value={logic.address.state} 
                            onValueChange={value => {
                              const next = {
                                ...logic.address,
                                state: value
                              };
                              logic.setAddress(next);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="State" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(logic.availableStates) && logic.availableStates.length > 0 ? 
                                logic.availableStates.sort((a: string, b: string) => a.localeCompare(b, 'es')).map((state: string) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                )) : (
                                  <SelectItem value="Ciudad de México">Ciudad de México</SelectItem>
                                )
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Teléfono */}
                      <div>
                        <CountryPhoneSelect 
                          value={logic.phone} 
                          onChange={logic.setPhone} 
                          onBlur={() => logic.saveClientData(true)} 
                          placeholder="55 3121 5386" 
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Métodos de envío */}
                {!logic.usePickup && logic.deliveryExpectations && logic.deliveryExpectations.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-4">Shipping methods</h3>
                    <div className="space-y-2">
                      {Array.isArray(logic.deliveryExpectations) && logic.deliveryExpectations.map((method: any, index: number) => (
                        <div key={index} className="border rounded-lg">
                          <label className="flex items-center justify-between p-4 cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <input 
                                type="radio" 
                                name="delivery-method" 
                                value={index} 
                                checked={logic.selectedDeliveryMethod?.type === method.type} 
                                onChange={() => {
                                  logic.setSelectedDeliveryMethod(method);
                                  logic.setShippingCost(method.hasPrice && method.price ? parseFloat(method.price) : 0);
                                }} 
                                className="w-4 h-4" 
                              />
                              <div>
                                <div className="font-medium">{method.type}</div>
                                <div className="text-sm text-muted-foreground">
                                  {method.description}
                                </div>
                              </div>
                            </div>
                            <div className="font-semibold">
                              {method.hasPrice && method.price ? `$${parseFloat(method.price).toFixed(2)}` : 'FREE'}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Dirección de facturación */}
                <section>
                  <h3 className="text-lg font-semibold mb-4">Billing address</h3>
                  <div className="space-y-4">
                    {/* Solo mostrar radio buttons cuando NO sea pickup */}
                    {!logic.usePickup && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="same-address"
                            name="billing-option"
                            checked={logic.useSameAddress}
                            onChange={() => logic.setUseSameAddress(true)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="same-address">Same as shipping address</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="different-address"
                            name="billing-option"
                            checked={!logic.useSameAddress}
                            onChange={() => logic.setUseSameAddress(false)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="different-address">Use a different billing address</Label>
                        </div>
                      </div>
                    )}

                    {/* Mostrar el formulario siempre cuando sea pickup, o cuando no sea pickup y hayan seleccionado dirección distinta */}
                    {(logic.usePickup || !logic.useSameAddress) && (
                      <Card>
                        <CardContent className="p-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="billing-first-name">First name</Label>
                              <Input
                                id="billing-first-name"
                                value={logic.billingAddress.first_name}
                                onChange={(e) => logic.setBillingAddress(prev => ({ ...prev, first_name: e.target.value }))}
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="billing-last-name">Last name</Label>
                              <Input
                                id="billing-last-name"
                                value={logic.billingAddress.last_name}
                                onChange={(e) => logic.setBillingAddress(prev => ({ ...prev, last_name: e.target.value }))}
                                placeholder="Last name"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="billing-country">Country</Label>
                              <Select 
                                value={logic.billingAddress.country} 
                                onValueChange={(value) => logic.setBillingAddress(prev => ({ ...prev, country: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.isArray(logic.availableCountries) && logic.availableCountries.map((country: any) => (
                                    <SelectItem key={country.name} value={country.name}>
                                      {country.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="billing-postal-code">Postal code</Label>
                              <Input
                                id="billing-postal-code"
                                value={logic.billingAddress.postal_code}
                                onChange={(e) => logic.setBillingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                                placeholder="00000"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="billing-state">State</Label>
                              <Select 
                                value={logic.billingAddress.state} 
                                onValueChange={(value) => logic.setBillingAddress(prev => ({ ...prev, state: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const states = logic.billingAddress.country === logic.address.country ? 
                                      logic.availableStates : 
                                      logic.availableCountries.find((c: any) => c.name === logic.billingAddress.country)?.states || [];
                                    return Array.isArray(states) && states.map((state: string) => (
                                      <SelectItem key={state} value={state}>
                                        {state}
                                      </SelectItem>
                                    ))
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="billing-city">City</Label>
                              <Input
                                id="billing-city"
                                value={logic.billingAddress.city}
                                onChange={(e) => logic.setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="City"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="billing-line1">Address</Label>
                            <Input
                              id="billing-line1"
                              value={logic.billingAddress.line1}
                              onChange={(e) => logic.setBillingAddress(prev => ({ ...prev, line1: e.target.value }))}
                              placeholder="Street and number"
                            />
                          </div>
                          <div>
                            <Label htmlFor="billing-line2">Apartment, suite, etc. (optional)</Label>
                            <Input
                              id="billing-line2"
                              value={logic.billingAddress.line2}
                              onChange={(e) => logic.setBillingAddress(prev => ({ ...prev, line2: e.target.value }))}
                              placeholder="Apartment, suite, etc."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </section>

                {/* Pago */}
                <section>
                  <h3 className="text-lg font-semibold mb-4">Payment</h3>
                  <StripePayment 
                    amountCents={Math.round(logic.finalTotal * 100)} 
                    currency={logic.currencyCode.toLowerCase()} 
                    description={`Pedido #${logic.orderId ?? 's/n'}`} 
                    metadata={{
                      order_id: logic.orderId ?? '',
                      ...(logic.discount?.code ? { discount_code: logic.discount.code } : {})
                    }} 
                    email={logic.email} 
                    name={`${logic.firstName} ${logic.lastName}`.trim()} 
                    phone={logic.phone} 
                    orderId={logic.orderId}
                    checkoutToken={logic.checkoutToken}
                    onValidationRequired={logic.validateCheckoutFields}
                    expectedTotal={Math.round(logic.finalTotal * 100)}
                    deliveryFee={Math.round((logic.shippingFromCheckout || logic.shippingCost) * 100)}
                    shippingAddress={logic.usePickup ? null : {
                      ...logic.address,
                      first_name: logic.firstName,
                      last_name: logic.lastName
                    }}
                    billingAddress={logic.usePickup ? logic.billingAddress : (logic.useSameAddress ? {
                      ...logic.address,
                      first_name: logic.firstName,
                      last_name: logic.lastName
                    } : logic.billingAddress)}
                    items={logic.orderItems}
                    deliveryExpectations={logic.usePickup ? 
                      [{ type: "pickup", description: "Store pickup" }] : 
                      (logic.selectedDeliveryMethod ? [logic.selectedDeliveryMethod] : [])
                    }
                    pickupLocations={logic.usePickup ? 
                      (logic.selectedPickupLocation ? [logic.selectedPickupLocation] : []) : 
                      []
                    }
                  />
                </section>
              </div>

              {/* Resumen del pedido */}
              <div className="md:sticky md:top-8 md:h-fit">
                <div className="bg-muted border-l border-muted-foreground/20 p-6 space-y-4 rounded-lg">
                  {/* Loading and stale data states */}
                  {logic.itemsLoading && logic.summaryItems.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading products...</p>
                    </div>
                  ) : null}
                  
                  {logic.isStale && logic.summaryItems.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4">
                            {logic.revalidating ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                            ) : (
                              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-yellow-800">
                            {logic.revalidating ? 'Restoring your cart...' : 'Showing saved data'}
                          </span>
                        </div>
                        {!logic.revalidating && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={logic.refreshItems}
                            className="text-yellow-800 hover:text-yellow-900"
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Productos del carrito */}
                  {logic.summaryItems.length === 0 && !logic.itemsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      {/* Empty cart icon */}
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                      
                      {/* Main message */}
                      <h3 className="text-lg font-semibold text-foreground">
                        Your cart is empty
                      </h3>
                      
                      {/* Secondary message */}
                      <p className="text-muted-foreground text-center text-sm">
                        Add a product to start your checkout
                      </p>
                      
                      {/* CTA Button */}
                      <Button 
                        onClick={() => navigate('/')}
                        className="mt-4"
                      >
                        Start Shopping
                      </Button>
                    </div>
                  ) : (
                    Array.isArray(logic.summaryItems) && logic.summaryItems.map(item => (
                      <div key={item.key} className="flex items-center space-x-4">
                        <div className="relative">
                          <img 
                            src={item.product.images?.[0] || "/placeholder.svg"} 
                            alt={item.product.name} 
                            className="w-16 h-16 object-cover rounded border" 
                          />
                          <span className="absolute -top-2 -right-2 bg-muted text-muted-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product.name}</h4>
                          {item.variant && <p className="text-sm text-muted-foreground">{item.variant.name}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-muted-foreground">Quantity</span>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-8 h-8 p-0" 
                                disabled={logic.updatingItems.has(item.key)}
                                aria-disabled={logic.updatingItems.has(item.key)}
                                onClick={() => logic.updateOrderQuantity(item.key, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="font-medium">{item.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-8 h-8 p-0" 
                                disabled={logic.updatingItems.has(item.key)}
                                aria-disabled={logic.updatingItems.has(item.key)}
                                onClick={() => logic.updateOrderQuantity(item.key, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold">
                          ${((item.variant?.price ?? item.product.price ?? 0) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Código de descuento */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Discount code</div>
                    {!logic.discount ? (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Enter your coupon" 
                          value={logic.couponCode} 
                          onChange={e => logic.setCouponCode(e.target.value.toUpperCase())} 
                          className="text-sm" 
                          ref={logic.couponInputRef} 
                          onKeyDown={(e) => { if (e.key === 'Enter') logic.validateCoupon(); }} 
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={logic.validateCoupon} 
                          disabled={logic.isValidatingCoupon || !logic.couponCode.trim()}
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          {logic.isValidatingCoupon ? '...' : 'Apply'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm bg-muted/50 border border-border p-3 rounded-lg">
                        <span className="text-foreground font-medium">
                          Coupon applied: {logic.couponCode}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={logic.removeCoupon} 
                          className="text-muted-foreground hover:text-foreground p-1 h-auto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Totales */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${logic.summaryTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className={`${logic.isCalculatingShipping ? 'opacity-50 blur-sm' : ''} transition-all duration-200`}>
                        {logic.selectedPickupLocation ? 'FREE (Store pickup)' : 
                         logic.shippingCost > 0 ? `$${logic.shippingCost.toFixed(2)}` : 'FREE'}
                      </span>
                    </div>
                    {logic.discount && (
                      <div className="flex justify-between">
                        <span>Discount ({logic.getDiscountDisplayText(logic.discount, logic.totalQuantity)})</span>
                        <span>- ${logic.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                      <span>Total</span>
                      <div className={`text-right ${logic.isCalculatingTotal ? 'opacity-50 blur-sm' : ''} transition-all duration-200`}>
                        <div className="text-sm text-muted-foreground">{logic.currencyCode.toUpperCase()}</div>
                        <div>${logic.finalTotal.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      Includes ${(logic.finalTotal * 0.16).toFixed(2)} in taxes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
        )
      }}
    </HeadlessCheckout>
  )
}