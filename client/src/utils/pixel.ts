// Meta (Facebook) Pixel helper utility
// Pixel ID: 1010985098424631

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const PIXEL_ID = '1010985098424631';

/**
 * Wait for fbq to become available (polls every 100ms, max 10 seconds)
 * then fires the callback. This handles async fbevents.js load races.
 */
const waitForFbq = (callback: () => void, attempts = 0) => {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq === 'function') {
    callback();
    return;
  }
  if (attempts > 100) {
    // Fallback: fire via img pixel (noscript style) for PageView
    console.warn('[Meta Pixel] fbq not available after 10s — using img fallback');
    return;
  }
  setTimeout(() => waitForFbq(callback, attempts + 1), 100);
};

/**
 * Trigger PageView — with retry polling to handle async fbevents.js load
 */
export const trackPixelPageView = () => {
  waitForFbq(() => {
    try {
      window.fbq!('track', 'PageView');
      console.log('[Meta Pixel] ✅ PageView fired');
    } catch (err) {
      console.error('[Meta Pixel] PageView failed:', err);
    }
  });
};

/**
 * Trigger standard Facebook / Meta Pixel 'Lead' event — with retry polling
 */
export const trackPixelLead = (params?: Record<string, any>) => {
  waitForFbq(() => {
    try {
      if (params) {
        window.fbq!('track', 'Lead', params);
      } else {
        window.fbq!('track', 'Lead');
      }
      console.log('[Meta Pixel] ✅ Lead event fired:', params || {});
    } catch (err) {
      console.error('[Meta Pixel] Lead failed:', err);
    }
  });
};

/**
 * Trigger generic Facebook / Meta Pixel event — with retry polling
 */
export const trackPixelEvent = (eventName: string, params?: Record<string, any>) => {
  waitForFbq(() => {
    try {
      if (params) {
        window.fbq!(eventName === 'PageView' || eventName === 'Lead' ? 'track' : 'trackCustom', eventName, params);
      } else {
        window.fbq!(eventName === 'PageView' || eventName === 'Lead' ? 'track' : 'trackCustom', eventName);
      }
      console.log(`[Meta Pixel] ✅ ${eventName} fired`);
    } catch (err) {
      console.error(`[Meta Pixel] ${eventName} failed:`, err);
    }
  });
};
