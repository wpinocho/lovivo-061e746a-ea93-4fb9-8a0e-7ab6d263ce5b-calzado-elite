/**
 * NO EDITAR - Solo referencia para el agente de IA
 * TIPO C - FORBIDDEN HEADLESS COMPONENT
 */

import { useMyOrdersLogic } from '@/adapters/MyOrdersAdapter'

interface HeadlessMyOrdersProps {
  children: (logic: ReturnType<typeof useMyOrdersLogic>) => React.ReactNode
}

export const HeadlessMyOrders = ({ children }: HeadlessMyOrdersProps) => {
  const logic = useMyOrdersLogic()
  return <>{children(logic)}</>
}
