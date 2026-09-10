/**
 * CSRF Token Management Utility for Frontend
 * 
 * Handles reading CSRF token from cookie and including it in request headers
 */

/**
 * Get CSRF token from browser cookies
 * @returns {string|null} CSRF token or null if not found
 */
export const getCsrfToken = () => {
    const name = 'csrfToken'
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
}

/**
 * Setup axios instance with automatic CSRF token injection
 * @param {Object} axiosInstance - Axios instance to configure
 * @returns {Object} Configured axios instance
 */
export const setupCsrfInterceptor = (axiosInstance) => {
    axiosInstance.interceptors.request.use(
        (config) => {
            // Only add CSRF token for state-changing requests
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
                const csrfToken = getCsrfToken()
                if (csrfToken) {
                    config.headers['X-CSRF-Token'] = csrfToken
                }
            }
            return config
        },
        (error) => Promise.reject(error)
    )
    
    return axiosInstance
}

/**
 * Check if CSRF token is available in cookies
 * @returns {boolean} True if token exists
 */
export const hasCsrfToken = () => {
    return getCsrfToken() !== null
}

export default {
    getCsrfToken,
    setupCsrfInterceptor,
    hasCsrfToken
}
