import { HeadlessCart } from "@/components/headless/HeadlessCart"
import { CartUI } from "@/pages/ui/CartUI"

/**
 * ROUTE COMPONENT - Cart
 * 
 * Este componente conecta HeadlessCart con CartUI.
 * Toda la lógica está en HeadlessCart y la presentación en CartUI.
 */

export default function Cart() {
  return (
    <HeadlessCart>
      {(logic) => <CartUI logic={logic} />}
    </HeadlessCart>
  )
}