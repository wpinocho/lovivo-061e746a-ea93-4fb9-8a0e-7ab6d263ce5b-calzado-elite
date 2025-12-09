import { HeadlessProduct } from "@/components/headless/HeadlessProduct"
import { ProductPageUI } from "@/pages/ui/ProductPageUI"

/**
 * ROUTE COMPONENT - Product
 * 
 * Este componente conecta HeadlessProduct con ProductPageUI.
 * Toda la lógica está en HeadlessProduct y la presentación en ProductPageUI.
 */

const Product = () => {
  return (
    <HeadlessProduct>
      {(logic) => <ProductPageUI logic={logic} />}
    </HeadlessProduct>
  )
}

export default Product