import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const limiterResponse = { success: false, message: 'Too many requests, please try again later.' }

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: limiterResponse
})

export const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: limiterResponse
})

export const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many AI requests, please try again later.' }
})

/**
 * Rate limiter for payment webhooks
 * Limits webhook attempts per payment order to prevent spam/DoS
 */
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 10, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many webhook requests for this payment. Please try again later.' },
    skip: (req) => {
        // Skip rate limiting for non-webhook requests
        return !req.body?.payload
    },
    keyGenerator: (req) => {
        // Use payment order ID as key if available, otherwise use IP with proper IPv6 support
        const orderId = req.body?.payload?.order?.id || req.body?.payload?.payment?.id
        if (orderId) {
            return `webhook_order_${orderId}`
        }
        // Fall back to IP address using ipKeyGenerator for proper IPv6 support
        return ipKeyGenerator(req)
    }
})
