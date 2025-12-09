import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { callEdge, callEdgeFetch } from "@/lib/edge";
import { STORE_ID } from "@/lib/config";
import { useSettings } from "@/contexts/SettingsContext";
import { useCheckout } from "@/hooks/useCheckout";
import { useOrderItems } from "@/hooks/useOrderItems";
import { calculateDiscountAmount, validateDiscount, type Discount } from "@/lib/discount-utils";
import { logger } from "@/lib/logger";
import { trackInitiateCheckout, tracking } from "@/lib/tracking-utils";

/**
 * FORBIDDEN ADAPTER - CheckoutAdapter
 * 
 * Este adaptador expone toda la lógica del checkout de forma controlada.
 * Los componentes de UI solo pueden consumir estos métodos, no modificar la lógica interna.
 */
export const useCheckoutLogic = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    currencyCode,
    shippingCoverage,
    pickupLocations,
    deliveryExpectations
  } = useSettings();
  const {
    hasActiveCheckout,
    isInitialized,
    orderId,
    checkoutToken,
    updateShippingAddress,
    updateBillingAddress,
    updateDiscountCode,
    updateStates
  } = useCheckout();
  
  const { 
    orderItems, 
    loading: itemsLoading, 
    updateQuantity: updateOrderQuantity, 
    removeItem: removeOrderItem,
    total: orderTotal,
    totalQuantity: orderTotalQuantity,
    updatingItems,
    isStale,
    revalidating,
    refreshItems,
    shippingAmount: itemsShippingAmount
  } = useOrderItems();

  const [order, setOrder] = useState<any>(null);

  // Contact state
  const [email, setEmail] = useState("");
  const [subscribeNews, setSubscribeNews] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Client data autosave with smart validation
  const clientTimer = useRef<number | null>(null);
  const [clientSaving, setClientSaving] = useState(false);
  
  // Address state
  const [address, setAddress] = useState({
    country: "México",
    postal_code: "",
    state: "",
    city: "",
    line1: "",
    line2: ""
  });

  // Pickup and delivery state
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<any>(null);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<any>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [usePickup, setUsePickup] = useState(false);

  // Billing address state
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    first_name: "",
    last_name: "",
    country: "México",
    postal_code: "",
    state: "",
    city: "",
    line1: "",
    line2: ""
  });

  // Keep shipping cost in sync - now from checkout-update response
  const [shippingFromCheckout, setShippingFromCheckout] = useState(0);

  // Discount state
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const couponInputRef = useRef<HTMLInputElement | null>(null);

  // Loading states for shipping and total calculations
  const isCalculatingShipping = updateStates.updating_address || updatingItems.size > 0;
  const isCalculatingTotal = updateStates.updating_address || updatingItems.size > 0;

  // Update shipping from order items updates
  useEffect(() => {
    if (typeof itemsShippingAmount === 'number') {
      console.log('Updating shipping from order items:', itemsShippingAmount);
      setShippingFromCheckout(itemsShippingAmount);
    }
  }, [itemsShippingAmount]);
  
  useEffect(() => {
    if (selectedPickupLocation) {
      setShippingCost(0);
      return;
    }
    
    const deliveryMethodCost = selectedDeliveryMethod && selectedDeliveryMethod.hasPrice && selectedDeliveryMethod.price ? parseFloat(selectedDeliveryMethod.price) : 0;
    const validDeliveryMethodCost = isFinite(deliveryMethodCost) ? deliveryMethodCost : 0;
    const totalShippingCost = shippingFromCheckout + validDeliveryMethodCost;
    
    setShippingCost(totalShippingCost);
  }, [selectedPickupLocation, selectedDeliveryMethod, deliveryExpectations, shippingFromCheckout]);

  useEffect(() => {
    // Load order from sessionStorage if available
    try {
      const raw = sessionStorage.getItem('checkout_order');
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    // Espera a que el estado de checkout se inicialice
    if (!isInitialized) return;

    // Fallback: si tenemos el id en sessionStorage, no redirigir
    try {
      const ssId = sessionStorage.getItem('checkout_order_id');
      if (ssId) return;
    } catch {}

    // Allow rendering even without active checkout - empty state will be shown in UI
    
    // Track InitiateCheckout event when checkout is active
    if (orderItems.length > 0) {
      trackInitiateCheckout({
        products: orderItems.map((item: any) => tracking.createTrackingProduct({
          id: item.product_id,
          title: item.product_title || item.product?.title,
          price: item.price || item.unit_price,
          category: 'product',
          variant: item.variant_id ? { id: item.variant_id } : undefined
        })),
        value: orderTotal,
        currency: tracking.getCurrencyFromSettings(currencyCode),
        num_items: orderTotalQuantity
      });
    }
  }, [isInitialized, hasActiveCheckout, navigate, toast, orderItems, orderTotal, currencyCode, orderTotalQuantity]);

  // Email validation
  const isValidEmail = (emailValue: string) => {
    const trimmed = emailValue.trim();
    if (trimmed.length < 5) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) && trimmed.includes('.') && !trimmed.endsWith('.');
  };

  // Phone validation
  const isValidPhone = (phoneValue: string) => {
    if (!phoneValue.trim()) return false;
    
    const phoneWithoutPrefix = phoneValue.replace(/^\+\d+\s?/, '').trim();
    const digitsOnly = phoneWithoutPrefix.replace(/[^\d]/g, '');
    
    return digitsOnly.length >= 4 && digitsOnly.length <= 15;
  };

  // Normalize phone number
  const normalizePhoneNumber = (phoneValue: string) => {
    if (!isValidPhone(phoneValue)) return null;
    
    if (phoneValue.startsWith('+')) {
      const digits = phoneValue.replace(/\D/g, '');
      const match = phoneValue.match(/^\+(\d+)\s?(.+)$/);
      if (match) {
        const countryCode = match[1];
        const number = match[2].replace(/\D/g, '');
        return `+${countryCode}${number}`;
      }
      return `+${digits}`;
    } else {
      const digits = phoneValue.replace(/\D/g, '');
      return `+52${digits}`;
    }
  };

  // Smart client data saving
  const saveClientData = async (immediate = false) => {
    if (!orderId) return;
    const trimmedEmail = email.trim();
    const normalizedPhone = normalizePhoneNumber(phone);

    const hasValidEmail = trimmedEmail && isValidEmail(trimmedEmail);
    const hasValidPhone = normalizedPhone !== null;

    if (!hasValidEmail && !hasValidPhone) return;

    const customerData: any = {};
    if (hasValidEmail) customerData.email = trimmedEmail;
    if (hasValidPhone) customerData.phone = normalizedPhone;

    if (firstName.trim().length >= 2) customerData.first_name = firstName.trim();
    if (lastName.trim().length >= 2) customerData.last_name = lastName.trim();

    customerData.allow_mkt = Boolean(subscribeNews);
    if (clientTimer.current) window.clearTimeout(clientTimer.current);
    const delay = immediate ? 0 : 600;
    clientTimer.current = window.setTimeout(async () => {
      setClientSaving(true);
      try {
        await callEdge('clients-upsert', {
          store_id: STORE_ID,
          order_id: orderId,
          customer: customerData
        });

        logger.debug('Cliente guardado:', {
          phoneInput: phone,
          hasValidPhone,
          hasValidEmail,
          email: hasValidEmail ? trimmedEmail : 'no válido',
          phone: hasValidPhone ? normalizedPhone : 'no válido',
          customerData
        });
      } catch (err: any) {
        console.error('clients-upsert error', err);
      } finally {
        setClientSaving(false);
      }
    }, delay);
  };

  // Debounced autosave for client data
  useEffect(() => {
    saveClientData();
    return () => {
      if (clientTimer.current) window.clearTimeout(clientTimer.current);
    };
  }, [email, firstName, lastName, phone, orderId]);

  // Reset shipping from checkout when country changes but no state selected
  useEffect(() => {
    if (address.country && !address.state) {
      setShippingFromCheckout(0);
      console.log('Country changed without state, resetting shipping from checkout to 0');
    }
  }, [address.country, address.state]);

  // Auto-update shipping address when minimal fields are available
  useEffect(() => {
    if (!hasActiveCheckout || !orderId) return;
    
    const hasMinimalFields = address.country && address.state && address.postal_code;
    
    if (!hasMinimalFields) return;

    const formattedAddress = {
      country_name: address.country,
      state_name: address.state,
      postal_code: address.postal_code,
      ...(address.city && { city: address.city }),
      ...(address.line1 && { line1: address.line1 }),
      ...(address.line2 && { line2: address.line2 }),
      ...(firstName.trim() && { first_name: firstName.trim() }),
      ...(lastName.trim() && { last_name: lastName.trim() })
    };

    console.log('Shipping address update triggered with:', formattedAddress);
    updateShippingAddress(formattedAddress).then((response: any) => {
      if (response && typeof response.shipping_amount === 'number') {
        console.log('Received shipping_amount from checkout-update:', response.shipping_amount);
        setShippingFromCheckout(response.shipping_amount);
      }
    }).catch(console.error);
  }, [address.country, address.state, address.postal_code, address.city, address.line1, address.line2, firstName, lastName, hasActiveCheckout, orderId, updateShippingAddress]);

  // Auto-update billing address when it changes
  useEffect(() => {
    if (!hasActiveCheckout || !orderId) return;
    
    if (!usePickup && useSameAddress) return;
    
    const minValid = billingAddress.country && billingAddress.postal_code && billingAddress.city && billingAddress.state && billingAddress.line1 && billingAddress.first_name && billingAddress.last_name;
    if (!minValid) return;

    const formattedBillingAddress = {
      first_name: billingAddress.first_name.trim() || undefined,
      last_name: billingAddress.last_name.trim() || undefined,
      line1: billingAddress.line1,
      line2: billingAddress.line2 || undefined,
      city: billingAddress.city,
      state: billingAddress.state,
      postal_code: billingAddress.postal_code,
      country_code: billingAddress.country === 'México' ? 'MX' : billingAddress.country === 'Estados Unidos' ? 'US' : 'MX'
    };

    updateBillingAddress(formattedBillingAddress).catch(console.error);
  }, [billingAddress, useSameAddress, usePickup, hasActiveCheckout, orderId, updateBillingAddress]);

  // Auto-update billing address to null when using same address
  useEffect(() => {
    if (!hasActiveCheckout || !orderId || usePickup) return;
    
    if (useSameAddress) {
      updateBillingAddress(null).catch(console.error);
    }
  }, [useSameAddress, usePickup, hasActiveCheckout, orderId, updateBillingAddress]);

  // Aplicar parámetros de URL (descuentos, contacto, etc.)
  const applyURLParams = (urlParams: any) => {
    if (!urlParams) return;
    
    console.log('📥 Applying URL params:', urlParams);
    
    // Aplicar email
    if (urlParams.email && isValidEmail(urlParams.email)) {
      setEmail(urlParams.email);
      console.log('✅ Email applied from URL:', urlParams.email);
    }
    
    // Aplicar nombres
    if (urlParams.firstName) {
      setFirstName(urlParams.firstName);
      console.log('✅ First name applied from URL:', urlParams.firstName);
    }
    if (urlParams.lastName) {
      setLastName(urlParams.lastName);
      console.log('✅ Last name applied from URL:', urlParams.lastName);
    }
    
    // Aplicar teléfono
    if (urlParams.phone) {
      setPhone(urlParams.phone);
      console.log('✅ Phone applied from URL:', urlParams.phone);
    }
  };

  // Validación diferida de descuento desde sessionStorage
  useEffect(() => {
    const pendingDiscount = sessionStorage.getItem('pendingDiscount');
    
    if (pendingDiscount && !discount && hasActiveCheckout) {
      console.log('🎟️ Found pending discount in sessionStorage:', pendingDiscount);
      
      // Aplicar el código al input
      setCouponCode(pendingDiscount);
      
      // Validar después de un delay para permitir que el componente se monte
      const timer = setTimeout(() => {
        console.log('🔍 Validating pending discount...');
        validateCoupon();
        // Limpiar sessionStorage después de aplicar
        sessionStorage.removeItem('pendingDiscount');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [hasActiveCheckout, discount]);

  // Coupon validation
  const validateCoupon = async () => {
    console.log('validateCoupon called with:', { couponCode: couponCode.trim(), hasActiveCheckout, orderId });
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const json = await callEdgeFetch('verify-discount', {
        store_id: STORE_ID,
        code: couponCode.trim().toUpperCase()
      });
      console.log('verify-discount response:', json);
      if (json.ok) {
        const discountData: Discount = json.data;
        const totalQuantity = summaryItems.reduce((total, item) => total + item.quantity, 0);
        const validation = validateDiscount(discountData, summaryTotal, totalQuantity);
        console.log('Discount validation result:', validation);
        if (validation.valid) {
          console.log('Setting discount and calling updateDiscountCode');
          setDiscount(discountData);
          try {
            await updateDiscountCode(couponCode.trim().toUpperCase(), true);
            console.log('checkout-update sent for discount_code apply');
          } catch (err) {
            console.error('Failed to update checkout with discount_code:', err);
          }
          toast({
            title: '¡Cupón aplicado!',
            description: `Descuento de ${discountData.discount_type === 'percentage' ? `${discountData.value}%` : `$${discountData.value}`} aplicado`,
            duration: 2000
          });
        } else {
          toast({
            title: 'Cupón no válido',
            description: validation.message,
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Cupón inválido',
          description: json.error || 'El cupón no es válido o ha expirado',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({
        title: 'Error',
        description: 'No se pudo validar el cupón. Intenta nuevamente.',
        variant: 'destructive'
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    console.log('removeCoupon called, current state:', { discount, couponCode, hasActiveCheckout, orderId });
    setDiscount(null);
    setCouponCode('');
    setIsValidatingCoupon(false);
    try {
      console.log('Calling updateDiscountCode with null');
      await updateDiscountCode(null, true);
      console.log('checkout-update sent for discount_code removal');
    } catch (err) {
      console.error('Failed to remove discount_code from checkout:', err);
    }
    toast({
      title: 'Cupón removido',
      description: 'El descuento ha sido removido',
      duration: 2000
    });
    requestAnimationFrame(() => couponInputRef.current?.focus());
    console.log('removeCoupon completed, new state should be:', { discount: null, couponCode: '' });
  };

  const getDiscountDisplayText = (discount: Discount, cartQuantity: number) => {
    if (discount.discount_type === 'percentage') return `${discount.value}%`;
    if (discount.discount_type === 'fixed_amount') return `$${discount.value}`;
    if (discount.discount_type === 'volume' && discount.volume_conditions) {
      try {
        const conditions = JSON.parse(discount.volume_conditions);
        let applicableDiscount = 0;
        for (const condition of conditions.sort((a: any, b: any) => b.quantity - a.quantity)) {
          if (cartQuantity >= condition.quantity) {
            applicableDiscount = condition.discount;
            break;
          }
        }
        return `${applicableDiscount}%`;
      } catch {
        return '0%';
      }
    }
    return '0%';
  };

  // Validation function for checkout fields
  const validateCheckoutFields = () => {
    const missingFields = [];
    
    if (!email.trim() || !isValidEmail(email)) {
      missingFields.push('email válido');
    }
    
    if (!usePickup && (!phone.trim() || !isValidPhone(phone))) {
      missingFields.push('teléfono');
    }
    
    if (usePickup) {
      if (!billingAddress.first_name.trim()) {
        missingFields.push('nombre (facturación)');
      }
      if (!billingAddress.last_name.trim()) {
        missingFields.push('apellido (facturación)');
      }
      if (!billingAddress.country) {
        missingFields.push('país (facturación)');
      }
      if (!billingAddress.state) {
        missingFields.push('estado (facturación)');
      }
      if (!billingAddress.city.trim()) {
        missingFields.push('ciudad (facturación)');
      }
      if (!billingAddress.postal_code.trim()) {
        missingFields.push('código postal (facturación)');
      }
      if (!billingAddress.line1.trim()) {
        missingFields.push('dirección (facturación)');
      }
    } else {
      if (!firstName.trim()) {
        missingFields.push('nombre');
      }
      if (!lastName.trim()) {
        missingFields.push('apellido');
      }
      if (!address.country) {
        missingFields.push('país');
      }
      if (!address.state) {
        missingFields.push('estado');
      }
      if (!address.city.trim()) {
        missingFields.push('ciudad');
      }
      if (!address.postal_code.trim()) {
        missingFields.push('código postal');
      }
      if (!address.line1.trim()) {
        missingFields.push('dirección');
      }
      
      if (deliveryExpectations && deliveryExpectations.length > 0) {
        if (!selectedDeliveryMethod) {
          missingFields.push('método de envío');
        }
      }
    }
    
    if (missingFields.length > 0) {
      toast({
        title: 'Campos requeridos',
        description: `Por favor completa: ${missingFields.join(', ')}`,
        variant: 'destructive',
        duration: 5000
      });
      return false;
    }
    
    return true;
  };

  // Page title (SEO)
  useEffect(() => {
    document.title = 'Checkout - Contacto, Envío y Pago';
  }, []);

  // Available countries and states from shipping coverage
  const availableCountries = shippingCoverage?.countries || [];
  const selectedCountryData = availableCountries.find((country: any) => country.name === address.country);
  const availableStates = selectedCountryData?.states || [];

  // Reset state when country changes
  useEffect(() => {
    if (address.country && selectedCountryData && !availableStates.includes(address.state)) {
      setAddress(prev => ({
        ...prev,
        state: ''
      }));
    }
  }, [address.country, availableStates, selectedCountryData, address.state]);

  // Summary calculations
  const summaryItems = orderItems;
  const summaryTotal = orderTotal;
  const totalQuantity = orderTotalQuantity;
  
  const itemsFingerprint = useMemo(() => 
    summaryItems.map(i => `${i.key}:${i.quantity}`).sort().join('|'), 
    [summaryItems]
  );

  const discountAmount = useMemo(() => {
    return discount ? calculateDiscountAmount(summaryTotal, discount.discount_type, discount.value, totalQuantity, discount.volume_conditions) : 0;
  }, [discount, summaryTotal, totalQuantity]);

  const finalTotal = Math.max(0, summaryTotal - discountAmount + shippingCost);

  // Payment enablement rules
  const requiresDeliveryMethod = !selectedPickupLocation && !!(deliveryExpectations && deliveryExpectations.length > 0);
  const canPay = !requiresDeliveryMethod || !!selectedDeliveryMethod;

  return {
    // State
    order,
    email,
    subscribeNews,
    firstName,
    lastName,
    phone,
    clientSaving,
    address,
    selectedPickupLocation,
    selectedDeliveryMethod,
    shippingCost,
    usePickup,
    useSameAddress,
    billingAddress,
    shippingFromCheckout,
    couponCode,
    discount,
    isValidatingCoupon,
    
    // Order data
    orderItems,
    itemsLoading,
    orderTotal,
    orderTotalQuantity,
    updatingItems,
    isStale,
    revalidating,
    
    // Checkout data
    hasActiveCheckout,
    isInitialized,
    orderId,
    checkoutToken,
    
    // Settings
    currencyCode,
    shippingCoverage,
    pickupLocations,
    deliveryExpectations,
    availableCountries,
    availableStates,
    
    // Calculated values
    summaryItems,
    summaryTotal,
    totalQuantity,
    itemsFingerprint,
    discountAmount,
    finalTotal,
    isCalculatingShipping,
    isCalculatingTotal,
    canPay,
    requiresDeliveryMethod,
    
    // Actions
    setEmail,
    setSubscribeNews,
    setFirstName,
    setLastName,
    setPhone,
    setAddress,
    setSelectedPickupLocation,
    setSelectedDeliveryMethod,
    setShippingCost,
    setUsePickup,
    setUseSameAddress,
    setBillingAddress,
    setCouponCode,
    
    // Functions
    saveClientData,
    validateCoupon,
    removeCoupon,
    getDiscountDisplayText,
    validateCheckoutFields,
    updateOrderQuantity,
    removeOrderItem,
    refreshItems,
    isValidEmail,
    isValidPhone,
    applyURLParams,
    
    // Refs
    couponInputRef,
    
    // Events for additional features
    onPaymentStart: () => {
      console.log('Payment process started - ready for additional features')
    },
    onPaymentSuccess: () => {
      console.log('Payment completed successfully - ready for additional tracking')
    }
  }
}
