// Meta (Facebook) Pixel helper utility

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const PIXEL_ID = '1010985098424631';

/**
 * Trigger standard Facebook / Meta Pixel 'Lead' event
 */
export const trackPixelLead = (params?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    try {
      if (typeof window.fbq === 'function') {
        if (params) {
          window.fbq('track', 'Lead', params);
        } else {
          window.fbq('track', 'Lead');
        }
        console.log('[Meta Pixel] Lead event fired successfully:', params || {});
      } else {
        console.warn('[Meta Pixel] fbq function not ready yet');
      }
    } catch (err) {
      console.error('[Meta Pixel] Failed to track Lead event:', err);
    }
  }
};

/**
 * Trigger generic Facebook / Meta Pixel event
 */
export const trackPixelEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      if (params) {
        window.fbq('track', eventName, params);
      } else {
        window.fbq('track', eventName);
      }
    } catch (err) {
      console.error(`[Meta Pixel] Failed to track ${eventName}:`, err);
    }
  }
};
