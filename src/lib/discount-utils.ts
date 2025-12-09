// Discount utility functions

export interface Discount {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'volume'
  value: number
  active: boolean
  starts_at?: string
  ends_at?: string
  minimum_amount?: number
  minimum_quantity?: number
  usage_limit?: number
  usage_count?: number
  volume_conditions?: string
}

export interface VolumeCondition {
  quantity: number
  discount: number
}

// Calculate discount amount
export function calculateDiscountAmount(
  originalAmount: number,
  discountType: 'percentage' | 'fixed_amount' | 'volume',
  discountValue: number,
  cartQuantity?: number,
  volumeConditions?: string
): number {
  switch (discountType) {
    case 'percentage':
      const percentageDiscount = originalAmount * (discountValue / 100);
      return percentageDiscount;
    case 'fixed_amount':
      return Math.min(discountValue, originalAmount);
    case 'volume':
      if (!volumeConditions || !cartQuantity) {
        return 0;
      }
      
      try {
        const conditions: VolumeCondition[] = JSON.parse(volumeConditions);
        
        // Find the highest applicable discount based on quantity
        let applicableDiscount = 0;
        for (const condition of conditions.sort((a, b) => b.quantity - a.quantity)) {
          if (cartQuantity >= condition.quantity) {
            applicableDiscount = condition.discount;
            break;
          }
        }
        
        const volumeDiscountAmount = originalAmount * (applicableDiscount / 100);
        return volumeDiscountAmount;
      } catch (error) {
        console.error('Error parsing volume conditions:', error)
        return 0;
      }
    default:
      return 0;
  }
}

/**
 * Validate discount eligibility
 */
export function validateDiscount(
  discount: Discount,
  cartTotal: number,
  cartQuantity: number
): { valid: boolean; message?: string } {
  const now = new Date();
  
  // Check if active
  if (!discount.active) {
    return { valid: false, message: 'El descuento no está activo' };
  }
  
  // Check start date
  if (discount.starts_at && now < new Date(discount.starts_at)) {
    return { valid: false, message: 'El descuento aún no es válido' };
  }
  
  // Check end date
  if (discount.ends_at && now > new Date(discount.ends_at)) {
    return { valid: false, message: 'El descuento ha expirado' };
  }
  
  // Check minimum amount
  if (discount.minimum_amount && cartTotal < discount.minimum_amount) {
    return { 
      valid: false, 
      message: `Monto mínimo requerido: $${discount.minimum_amount.toFixed(2)}` 
    };
  }
  
  // Check minimum quantity
  if (discount.minimum_quantity && cartQuantity < discount.minimum_quantity) {
    return { 
      valid: false, 
      message: `Cantidad mínima requerida: ${discount.minimum_quantity} productos` 
    };
  }
  
  // Check usage limit
  if (discount.usage_limit && (discount.usage_count || 0) >= discount.usage_limit) {
    return { valid: false, message: 'Este descuento ha alcanzado su límite de uso' };
  }
  
  return { valid: true };
}