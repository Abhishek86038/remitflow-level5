// RemitFlow Application Performance and Error Monitoring Utility

export const initMonitoring = () => {
  console.log('📊 [Monitoring] Initializing Application Health Monitoring...');
  
  // Track global uncaught errors
  window.addEventListener('error', (event) => {
    console.error('🚨 [Monitoring] Unhandled Error Captured:', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      col: event.colno,
      error: event.error ? event.error.stack : null,
      timestamp: new Date().toISOString()
    });
  });

  // Track unhandled promise rejections (very common in Web3/Stellar)
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 [Monitoring] Unhandled Promise Rejection Captured:', {
      reason: event.reason ? (event.reason.message || event.reason) : 'Unknown reason',
      timestamp: new Date().toISOString()
    });
  });
};

export const logMetric = (metricName, value, tags = {}) => {
  console.log(`⏱️ [Monitoring] Metric [${metricName}]: ${value}ms`, {
    ...tags,
    timestamp: new Date().toISOString()
  });
};

export const logException = (error, context = {}) => {
  console.error('💥 [Monitoring] Exception logged to telemetry:', {
    message: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};
