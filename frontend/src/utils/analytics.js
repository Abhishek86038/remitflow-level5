// RemitFlow Product Analytics & Event Tracking Utility

const ANALYTICS_STORAGE_KEY = 'remitflow_analytics_events';

const saveEvent = (event) => {
  try {
    const existing = JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY) || '[]');
    existing.push(event);
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(existing.slice(-200))); // Keep last 200 events
  } catch (e) {
    console.error('[Analytics] Failed to save event to local storage', e);
  }
};

export const initAnalytics = () => {
  console.log('📈 [Analytics] Initializing Event Tracking...');
  trackEvent('app_initialized', { referrer: document.referrer });
};

export const trackEvent = (eventName, properties = {}) => {
  const event = {
    eventName,
    properties,
    timestamp: new Date().toISOString(),
    sessionUrl: window.location.href,
    userAgent: navigator.userAgent
  };

  console.log(`📊 [Analytics] Event: [${eventName}]`, properties);
  saveEvent(event);
};

export const getSessionEvents = () => {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
};
