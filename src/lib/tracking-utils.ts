import { facebookPixel } from '@/lib/facebook-pixel';
import posthog from 'posthog-js';
import { STORE_ID } from '@/lib/config';

// Types for tracking parameters
export interface TrackingProduct {
  id: string;
  name?: string;
  price?: number;
  category?: string;
  variant_id?: string;
  variant_name?: string;
}

export interface TrackingParams {
  products?: TrackingProduct[];
  value?: number;
  currency?: string;
  search_string?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
  custom_parameters?: Record<string, any>;
}

class TrackingUtility {
  private isDebugMode = process.env.NODE_ENV === 'development';
  
  private log(event: string, params: any) {
    if (this.isDebugMode) {
      console.group(`🎯 Tracking: ${event}`);
      console.log('Parameters:', params);
      console.groupEnd();
    }
  }

  private logError(event: string, error: any) {
    console.error(`❌ Tracking Error (${event}):`, error);
  }

  private isPostHogLoaded(): boolean {
    return typeof window !== 'undefined' && posthog.__loaded;
  }

  private formatCurrency(currency?: string): string {
    if (!currency) return 'mxn';
    return currency.toLowerCase().replace(/[^a-z]/g, '');
  }

  private formatValue(value?: number): number {
    if (typeof value !== 'number' || isNaN(value) || value < 0) return 0;
    return Math.round(value * 100) / 100; // Round to 2 decimals
  }

  private formatContentIds(products?: TrackingProduct[]): string[] {
    if (!Array.isArray(products) || products.length === 0) return [];
    return products
      .map(p => p.id)
      .filter(id => typeof id === 'string' && id.length > 0);
  }

  private buildStandardParams(params: TrackingParams) {
    const { products, value, currency, num_items } = params;
    
    return {
      content_ids: this.formatContentIds(products),
      content_type: 'product',
      value: this.formatValue(value),
      currency: this.formatCurrency(currency),
      ...(num_items && { num_items: Math.max(1, Math.floor(num_items)) })
    };
  }


  /**
   * Track page view - automatically called on route changes
   */
  trackPageView(): void {
    try {
      facebookPixel.pageView();
      
      if (this.isPostHogLoaded()) {
        posthog.capture('$pageview');
      }
      
      this.log('PageView', {});
    } catch (error) {
      this.logError('PageView', error);
    }
  }

  /**
   * Track when user views a product
   */
  trackViewContent(params: TrackingParams): void {
    try {
      const { products, value, currency, content_category } = params;
      
      if (!products || products.length === 0) {
        console.warn('🟡 ViewContent: No products provided');
        return;
      }

      const trackingParams = {
        ...this.buildStandardParams(params),
        ...(content_category && { content_category })
      };

      facebookPixel.viewContent(trackingParams);
      
      if (this.isPostHogLoaded()) {
        posthog.capture('product_viewed', {
          product_ids: trackingParams.content_ids,
          value: trackingParams.value,
          currency: trackingParams.currency,
          content_category
        });
      }
      
      this.log('ViewContent', trackingParams);
    } catch (error) {
      this.logError('ViewContent', error);
    }
  }

  /**
   * Track when user adds product to cart
   */
  trackAddToCart(params: TrackingParams): void {
    try {
      const { products, value, currency } = params;
      
      if (!products || products.length === 0) {
        console.warn('🟡 AddToCart: No products provided');
        return;
      }

      if (!value || value <= 0) {
        console.warn('🟡 AddToCart: Invalid value provided');
        return;
      }

      const trackingParams = this.buildStandardParams(params);
      facebookPixel.addToCart(trackingParams);
      
      if (this.isPostHogLoaded()) {
        posthog.capture('product_added_to_cart', {
          product_ids: trackingParams.content_ids,
          value: trackingParams.value,
          currency: trackingParams.currency
        });
      }
      
      this.log('AddToCart', trackingParams);
    } catch (error) {
      this.logError('AddToCart', error);
    }
  }

  /**
   * Track when user initiates checkout process
   */
  trackInitiateCheckout(params: TrackingParams): void {
    try {
      const { products, value, currency, num_items } = params;
      
      if (!products || products.length === 0) {
        console.warn('🟡 InitiateCheckout: No products provided');
        return;
      }

      if (!value || value <= 0) {
        console.warn('🟡 InitiateCheckout: Invalid value provided');
        return;
      }

      const trackingParams = {
        ...this.buildStandardParams(params),
        num_items: num_items || products.length
      };

      facebookPixel.initiateCheckout(trackingParams);
      
      if (this.isPostHogLoaded()) {
        posthog.capture('checkout_initiated', {
          product_ids: trackingParams.content_ids,
          value: trackingParams.value,
          currency: trackingParams.currency,
          num_items: trackingParams.num_items
        });
      }
      
      this.log('InitiateCheckout', trackingParams);
    } catch (error) {
      this.logError('InitiateCheckout', error);
    }
  }

  /**
   * Track successful purchase
   */
  trackPurchase(params: TrackingParams): void {
    try {
      const { products, value, currency, order_id } = params;
      
      if (!products || products.length === 0) {
        console.warn('🟡 Purchase: No products provided');
        return;
      }

      if (!value || value <= 0) {
        console.warn('🟡 Purchase: Invalid value provided');
        return;
      }

      const trackingParams = {
        ...this.buildStandardParams(params),
        ...(order_id && { 
          custom_data: { 
            order_id,
            ...params.custom_parameters 
          }
        })
      };

      facebookPixel.purchase(trackingParams);
      
      if (this.isPostHogLoaded()) {
        posthog.capture('purchase_completed', {
          product_ids: trackingParams.content_ids,
          value: trackingParams.value,
          currency: trackingParams.currency,
          order_id,
          ...params.custom_parameters
        });
      }
      
      this.log('Purchase', trackingParams);
    } catch (error) {
      this.logError('Purchase', error);
    }
  }

  /**
   * Track search events
   */
  trackSearch(params: TrackingParams): void {
    try {
      const { search_string, products } = params;
      
      if (!search_string || search_string.trim().length === 0) {
        console.warn('🟡 Search: No search string provided');
        return;
      }

      const trackingParams = {
        search_string: search_string.trim(),
        ...(products && products.length > 0 && {
          content_ids: this.formatContentIds(products)
        })
      };

      facebookPixel.search(trackingParams);
      
      if (this.isPostHogLoaded()) {
        posthog.capture('search_performed', {
          search_query: search_string.trim(),
          ...(products && products.length > 0 && {
            product_ids: this.formatContentIds(products)
          })
        });
      }
      
      this.log('Search', trackingParams);
    } catch (error) {
      this.logError('Search', error);
    }
  }

  /**
   * Track custom events
   */
  trackCustomEvent(eventName: string, parameters?: Record<string, any>): void {
    try {
      if (!eventName || eventName.trim().length === 0) {
        console.warn('🟡 CustomEvent: No event name provided');
        return;
      }

      const cleanEventName = eventName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
      const trackingParams = parameters || {};

      facebookPixel.track(cleanEventName, trackingParams);
      
      if (this.isPostHogLoaded()) {
        posthog.capture(cleanEventName, trackingParams);
      }
      
      this.log(`CustomEvent: ${cleanEventName}`, trackingParams);
    } catch (error) {
      this.logError(`CustomEvent: ${eventName}`, error);
    }
  }

  /**
   * Helper method to create product objects from different data sources
   */
  createTrackingProduct(data: {
    id: string;
    title?: string;
    price?: number;
    category?: string;
    variant?: any;
  }): TrackingProduct {
    return {
      id: data.id,
      name: data.title,
      price: this.formatValue(data.price),
      category: data.category,
      variant_id: data.variant?.id,
      variant_name: data.variant?.title
    };
  }

  /**
   * Helper method to get currency from settings
   */
  getCurrencyFromSettings(currencyCode?: string): string {
    return this.formatCurrency(currencyCode || 'MXN');
  }
}

// Export singleton instance
export const tracking = new TrackingUtility();

// Export helper functions for easy access
export const trackPageView = () => tracking.trackPageView();

export const trackViewContent = (params: TrackingParams) => tracking.trackViewContent(params);

export const trackAddToCart = (params: TrackingParams) => tracking.trackAddToCart(params);

export const trackInitiateCheckout = (params: TrackingParams) => tracking.trackInitiateCheckout(params);

export const trackPurchase = (params: TrackingParams) => tracking.trackPurchase(params);

export const trackSearch = (params: TrackingParams) => tracking.trackSearch(params);

export const trackCustomEvent = (eventName: string, parameters?: Record<string, any>) => 
  tracking.trackCustomEvent(eventName, parameters);

// Export the main tracking instance
export default tracking;