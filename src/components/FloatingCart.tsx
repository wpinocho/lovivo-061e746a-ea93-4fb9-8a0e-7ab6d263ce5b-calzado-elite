import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import { useCartUI } from "@/components/CartProvider"

export const FloatingCart = () => {
  const { getTotalItems } = useCart()
  const { openCart } = useCartUI()
  const totalItems = getTotalItems()

  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={openCart}
        className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300"
        size="icon"
      >
        <div className="relative">
          <ShoppingCart className="h-7 w-7" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ring-2 ring-background">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </div>
      </Button>
    </div>
  )
}