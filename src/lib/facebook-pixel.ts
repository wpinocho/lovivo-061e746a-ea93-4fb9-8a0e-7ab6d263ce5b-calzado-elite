import ReactPixel from 'react-facebook-pixel';

export interface FacebookPixelEvent {
  event: string;
  parameters?: Record<string, any>;
}

class FacebookPixelService {
  private initialized = false;
  private pixelId: string | null = null;

  init(pixelId: string) {
    if (this.initialized || !pixelId) return;
    
    this.pixelId = pixelId;
    ReactPixel.init(pixelId);
    this.initialized = true;
    console.log('Facebook Pixel initialized with ID:', pixelId);
  }

  pageView() {
    if (!this.initialized) return;
    ReactPixel.pageView();
  }

  track(event: string, parameters?: Record<string, any>) {
    if (!this.initialized) return;
    ReactPixel.track(event, parameters);
  }

  // E-commerce specific events
  viewContent(parameters: {
    content_ids: string[];
    content_type: string;
    value?: number;
    currency?: string;
  }) {
    this.track('ViewContent', parameters);
  }

  addToCart(parameters: {
    content_ids: string[];
    content_type: string;
    value: number;
    currency: string;
  }) {
    this.track('AddToCart', parameters);
  }

  initiateCheckout(parameters: {
    content_ids: string[];
    value: number;
    currency: string;
    num_items: number;
  }) {
    this.track('InitiateCheckout', parameters);
  }

  purchase(parameters: {
    content_ids: string[];
    value: number;
    currency: string;
    content_type: string;
  }) {
    this.track('Purchase', parameters);
  }

  search(parameters: {
    search_string: string;
    content_ids?: string[];
  }) {
    this.track('Search', parameters);
  }
}

export const facebookPixel = new FacebookPixelService();