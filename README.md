# 🚀 Lovivo E-commerce Architecture

## 📋 Arquitectura del Proyecto

Este proyecto usa la **Arquitectura Lovivo**: una separación estricta entre lógica de negocio y presentación, diseñada para que agentes IA puedan modificar la UI sin afectar funcionalidades críticas.

## 🔒 Clasificación de Archivos

### 🚫 ARCHIVOS FORBIDDEN (No modificables por IA)
**Estos archivos contienen lógica de negocio crítica y NO pueden ser modificados:**

#### Headless Components (Lógica pura)
- `src/components/headless/HeadlessCart.tsx`
- `src/components/headless/HeadlessCheckout.tsx`  
- `src/components/headless/HeadlessProduct.tsx`
- `src/components/headless/HeadlessProductCard.tsx`

#### Adapters (Controladores de lógica)
- `src/adapters/CartAdapter.tsx`
- `src/adapters/CheckoutAdapter.tsx`
- `src/adapters/ProductAdapter.tsx`

#### Contexts & Hooks (Estado y lógica)
- `src/contexts/CartContext.tsx`
- `src/contexts/PixelContext.tsx`
- `src/contexts/SettingsContext.tsx`
- `src/hooks/useCheckout.ts`
- `src/hooks/useCheckoutState.ts`
- `src/hooks/useCountries.ts`
- `src/hooks/useOrderItems.ts`
- `src/hooks/usePixelId.ts`

#### Core Libraries (Funcionalidades críticas)
- `src/lib/supabase.ts`
- `src/lib/checkout.ts`
- `src/lib/edge.ts`
- `src/lib/config.ts`
- `src/lib/discount-utils.ts`
- `src/lib/facebook-pixel.ts`
- `src/lib/logger.ts`
- `src/lib/money.ts`
- `src/lib/tracking-utils.ts`

### ✅ ARCHIVOS EDITABLE (Modificables por IA)
**Estos archivos solo contienen presentación y pueden ser modificados libremente:**

#### Templates (Layouts reutilizables)
- `src/templates/PageTemplate.tsx`
- `src/templates/EcommerceTemplate.tsx`

#### UI Pages (Solo presentación)
- `src/pages/ui/CartUI.tsx`
- `src/pages/ui/CheckoutUI.tsx`
- `src/pages/ui/ProductPageUI.tsx`

#### UI Components (Solo estilos y layout)
- `src/components/ui/ProductCardUI.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- Todos los demás componentes en `/ui/`

#### Route Components (Conectores simples)
- `src/pages/Product.tsx`
- `src/pages/Cart.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/Index.tsx`
- `src/pages/Blog.tsx`
- `src/pages/BlogPost.tsx`
- `src/pages/NotFound.tsx`
- `src/pages/ThankYou.tsx`

#### Visual Components (Solo presentación)
- `src/components/ProductCard.tsx`
- `src/components/BrandLogoLeft.tsx`
- `src/components/SocialLinks.tsx`
- `src/components/FloatingCart.tsx`
- `src/components/CartSidebar.tsx`
- `src/components/CartProvider.tsx`
- `src/components/CollectionCard.tsx`
- `src/components/CountryPhoneSelect.tsx`
- `src/components/FaviconManager.tsx`
- `src/components/StripePayment.tsx`

#### Utilities & Styles (Helpers seguros)
- `src/lib/utils.ts`
- `src/lib/logo-utils.ts`
- `src/lib/social-icons.ts`
- `src/index.css`
- `tailwind.config.ts`

## 🎯 Flujo de Arquitectura

```
ROUTE COMPONENT → HEADLESS COMPONENT → UI COMPONENT
     ↓                    ↓                ↓
[Conecta lógica]    [Contiene lógica]  [Solo estilos]
[EDITABLE]          [FORBIDDEN]        [EDITABLE]
```

### Ejemplo: Product Page
```
Product.tsx → HeadlessProduct → ProductPageUI.tsx
   ↓              ↓                    ↓
Conecta       Fetch, variants,     Layout, colores,
              add to cart          formularios
```

## 🎨 Sistema de Templates

### PageTemplate
Template base con slots editables:
- `header`: Encabezado personalizable
- `sidebar`: Barra lateral opcional  
- `footer`: Pie de página
- `layout`: 'default' | 'full-width' | 'sidebar-left' | 'sidebar-right' | 'centered'

### EcommerceTemplate  
Template específico para ecommerce que incluye:
- Header con navegación y carrito
- Footer con enlaces sociales  
- FloatingCart automático

## 🚀 Beneficios

1. **🔒 Seguridad**: La lógica de negocio está protegida
2. **🎨 Flexibilidad**: UI completamente customizable  
3. **⚡ Velocidad**: Cambios visuales sin riesgo
4. **🧩 Modularidad**: Componentes reutilizables
5. **🤖 IA-Friendly**: El agente puede trabajar libremente en UI

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Deploy
npm run deploy
```

## 📝 Contribución

Al trabajar en este proyecto:

1. **NO modifiques archivos FORBIDDEN** sin supervisión
2. **USA los templates** para nuevas páginas
3. **IMPORTA utilidades** desde sus archivos específicos
4. **MANTÉN la separación** lógica/presentación

---

**⚡ Arquitectura Lovivo**: Donde la lógica está segura y la creatividad es libre.