import { useCartLogic } from "@/adapters/CartAdapter"

/**
 * FORBIDDEN HEADLESS COMPONENT - HeadlessCart
 * 
 * Este componente headless contiene toda la lógica del carrito sin UI.
 * Usa el patrón render props para permitir que los componentes de UI 
 * consuman la lógica sin acceso directo a ella.
 * 
 * CONTIENE TODA LA LÓGICA DE NEGOCIO DEL CARRITO:
 * - Estado del carrito (items, total, cantidad)
 * - Funciones para modificar carrito (agregar, quitar, actualizar)
 * - Lógica de checkout y navegación
 * - Estados de carga y validación
 */

interface HeadlessCartProps {
  children: (logic: ReturnType<typeof useCartLogic>) => React.ReactNode
}

export const HeadlessCart = ({ children }: HeadlessCartProps) => {
  const cartLogic = useCartLogic()
  
  return <>{children(cartLogic)}</>
}