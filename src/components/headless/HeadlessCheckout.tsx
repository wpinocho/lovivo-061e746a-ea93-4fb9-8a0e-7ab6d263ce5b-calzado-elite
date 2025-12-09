import { useCheckoutLogic } from "@/adapters/CheckoutAdapter"

/**
 * FORBIDDEN HEADLESS COMPONENT - HeadlessCheckout
 * 
 * Este componente headless contiene toda la lógica del checkout usando CheckoutAdapter.
 * Usa el patrón render props para permitir que los componentes de UI 
 * consuman la lógica sin acceso directo a ella.
 */

interface HeadlessCheckoutProps {
  children: (logic: ReturnType<typeof useCheckoutLogic>) => React.ReactNode
}

export const HeadlessCheckout = ({ children }: HeadlessCheckoutProps) => {
  const checkoutLogic = useCheckoutLogic()
  
  return <>{children(checkoutLogic)}</>
}