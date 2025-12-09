// Debug logging utility with feature flag control

// Enable debug logs in development or when explicitly enabled
const ENABLE_CHECKOUT_DEBUG = import.meta.env.DEV || localStorage.getItem('ENABLE_CHECKOUT_DEBUG') === 'true'

export const logger = {
  debug: (...args: any[]) => {
    if (ENABLE_CHECKOUT_DEBUG) {
      console.log(...args)
    }
  },
  info: (...args: any[]) => {
    console.info(...args)
  },
  warn: (...args: any[]) => {
    console.warn(...args)
  },
  error: (...args: any[]) => {
    console.error(...args)
  }
}

// Export a function to toggle debug logging at runtime
export const toggleCheckoutDebug = (enable?: boolean) => {
  const shouldEnable = enable ?? !localStorage.getItem('ENABLE_CHECKOUT_DEBUG')
  if (shouldEnable) {
    localStorage.setItem('ENABLE_CHECKOUT_DEBUG', 'true')
  } else {
    localStorage.removeItem('ENABLE_CHECKOUT_DEBUG')
  }
  window.location.reload() // Reload to apply changes
}