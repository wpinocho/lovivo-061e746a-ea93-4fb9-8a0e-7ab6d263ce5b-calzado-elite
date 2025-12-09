/**
 * URL Parameters Utility
 * 
 * Parsea y sanitiza parámetros de URL para pre-llenar información del checkout
 * Ejemplos:
 * - ?discount=SAVE20
 * - ?email=user@example.com&firstName=Juan&discount=WELCOME10
 * - ?items=prod123:1,prod456:2&discount=BUNDLE15
 */

export interface CheckoutURLParams {
  discount?: string           // ?discount=SAVE20
  email?: string             // ?email=user@example.com  
  firstName?: string         // ?firstName=John
  lastName?: string          // ?lastName=Doe
  phone?: string             // ?phone=+525512345678
  items?: string             // ?items=prod1:1,prod2:2 (productId:quantity)
  variant?: string           // ?variant=12345
  quantity?: string          // ?quantity=2
}

/**
 * Parsea parámetros de URL relevantes para checkout
 */
export const parseCheckoutParams = (searchParams: URLSearchParams): CheckoutURLParams => {
  return {
    discount: searchParams.get('discount') || undefined,
    email: searchParams.get('email') || undefined,
    firstName: searchParams.get('firstName') || searchParams.get('first_name') || undefined,
    lastName: searchParams.get('lastName') || searchParams.get('last_name') || undefined,
    phone: searchParams.get('phone') || undefined,
    items: searchParams.get('items') || undefined,
    variant: searchParams.get('variant') || undefined,
    quantity: searchParams.get('quantity') || undefined,
  }
}

/**
 * Parsea string de items en formato "prod1:1,prod2:2"
 */
export const parseCartItems = (itemsString: string) => {
  if (!itemsString) return []
  
  try {
    return itemsString.split(',').map(item => {
      const [productId, quantity] = item.split(':')
      return {
        productId: productId.trim(),
        quantity: parseInt(quantity) || 1
      }
    }).filter(item => item.productId) // Filtrar items inválidos
  } catch (error) {
    console.error('Error parsing cart items:', error)
    return []
  }
}

/**
 * Sanitiza y valida parámetros de URL para prevenir XSS/injection
 */
export const sanitizeURLParams = (params: CheckoutURLParams): CheckoutURLParams => {
  const sanitized: CheckoutURLParams = {}
  
  // Email: lowercase, trim, validación básica
  if (params.email) {
    const email = params.email.toLowerCase().trim()
    if (email.length <= 255 && email.includes('@')) {
      sanitized.email = email
    }
  }
  
  // Discount: uppercase, trim, solo alfanuméricos y guiones
  if (params.discount) {
    const discount = params.discount.toUpperCase().trim()
    if (/^[A-Z0-9-_]{1,50}$/.test(discount)) {
      sanitized.discount = discount
    }
  }
  
  // Phone: remover espacios y caracteres no numéricos excepto +
  if (params.phone) {
    const phone = params.phone.replace(/[^\d+]/g, '')
    if (phone.length >= 8 && phone.length <= 20) {
      sanitized.phone = phone
    }
  }
  
  // Nombres: trim, máximo 100 caracteres, solo letras y espacios
  if (params.firstName) {
    const firstName = params.firstName.trim()
    if (firstName.length <= 100 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(firstName)) {
      sanitized.firstName = firstName
    }
  }
  
  if (params.lastName) {
    const lastName = params.lastName.trim()
    if (lastName.length <= 100 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(lastName)) {
      sanitized.lastName = lastName
    }
  }
  
  // Items, variant, quantity (sin sanitizar por ahora, para uso futuro)
  if (params.items) sanitized.items = params.items
  if (params.variant) sanitized.variant = params.variant
  if (params.quantity) sanitized.quantity = params.quantity
  
  return sanitized
}

/**
 * Verifica si hay parámetros válidos en el objeto
 */
export const hasValidParams = (params: CheckoutURLParams): boolean => {
  return Object.values(params).some(value => value !== undefined && value !== '')
}
