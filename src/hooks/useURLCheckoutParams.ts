import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseCheckoutParams, sanitizeURLParams, hasValidParams, CheckoutURLParams } from '@/lib/url-params'

/**
 * Hook para parsear y consumir parámetros de URL en checkout
 * 
 * Funcionalidad:
 * 1. Parsea parámetros de URL al montar el componente
 * 2. Si hay descuento, lo guarda en sessionStorage para validación diferida
 * 3. Limpia la URL después de procesar para no exponer datos sensibles
 * 
 * Uso:
 * const { params, hasParams } = useURLCheckoutParams()
 * 
 * useEffect(() => {
 *   if (hasParams && params) {
 *     applyURLParams(params)
 *   }
 * }, [hasParams, params])
 */
export const useURLCheckoutParams = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [parsedParams, setParsedParams] = useState<CheckoutURLParams | null>(null)
  const [isProcessed, setIsProcessed] = useState(false)
  
  useEffect(() => {
    // Solo procesar una vez
    if (isProcessed) return
    
    const params = parseCheckoutParams(searchParams)
    const sanitized = sanitizeURLParams(params)
    
    // Solo procesar si hay parámetros válidos
    if (hasValidParams(sanitized)) {
      setParsedParams(sanitized)
      
      // Si hay descuento, guardarlo en sessionStorage para validación diferida
      if (sanitized.discount) {
        sessionStorage.setItem('pendingDiscount', sanitized.discount)
        console.log('🎟️ Discount code from URL stored for validation:', sanitized.discount)
      }
      
      // Limpiar URL después de procesar (para no exponer datos sensibles)
      setSearchParams({}, { replace: true })
      
      setIsProcessed(true)
    }
  }, [searchParams, isProcessed, setSearchParams])
  
  return {
    params: parsedParams,
    hasParams: parsedParams !== null && hasValidParams(parsedParams),
    clearParams: () => {
      setParsedParams(null)
      setIsProcessed(false)
      sessionStorage.removeItem('pendingDiscount')
    }
  }
}
