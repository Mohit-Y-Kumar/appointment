import mongoose from 'mongoose'
import auditLogModel from '../models/auditLogModel.js'
import logger from '../config/logger.js'

/**
 * Audit Logging Middleware
 */

const safeAuditWrite = async (logEntry) => {
    if (mongoose.connection.readyState !== 1) {
        logger.warn('Audit logging skipped because MongoDB is not connected', {
            action: logEntry.action,
            resourceType: logEntry.resourceType,
            path: logEntry.path
        })
        return
    }

    try {
        await auditLogModel.create(logEntry)
    } catch (error) {
        logger.error('Failed to create audit log', {
            message: error.message,
            action: logEntry.action,
            path: logEntry.path,
            userId: logEntry.userId || 'anonymous'
        })
    }
}

export const auditLog = async (req, res, next) => {
    const start = Date.now()
    
    // Intercept response to capture status and body
    const originalJson = res.json
    let responseBody = null
    let statusCode = 200

    res.json = function(data) {
        responseBody = data
        statusCode = res.statusCode
        return originalJson.call(this, data)
    }

    // Log after response is sent without blocking the request lifecycle if MongoDB is unavailable
    res.on('finish', () => {
        const duration = Date.now() - start

        void (async () => {
            try {
                const auditAction = getAuditAction(req.method, req.path, responseBody)

                if (!auditAction) return

                const logEntry = {
                    userId: req.userId || null,
                    userEmail: req.userEmail || null,
                    userRole: req.role || null,
                    action: auditAction.action,
                    resourceType: auditAction.resourceType,
                    resourceId: auditAction.resourceId || null,
                    method: req.method,
                    path: req.path,
                    statusCode,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    responseStatus: getResponseStatus(statusCode),
                    errorMessage: responseBody?.message || null,
                    duration
                }

                if (auditAction.logBody) {
                    logEntry.requestBody = sanitizeBody(req.body)
                }

                if (auditAction.extractChanges) {
                    logEntry.changes = extractChanges(req.body)
                }

                await safeAuditWrite(logEntry)
            } catch (error) {
                logger.error('Audit logging error', {
                    message: error.message,
                    path: req.path,
                    method: req.method
                })
            }
        })()
    })

    next()
}

/**
 * Determine which actions to audit based on method and path
 */
const getAuditAction = (method, path, response) => {
    const pathParts = path.split('/')

    // Authentication
    if (path.includes('/login') && method === 'POST') {
        return { action: 'login', resourceType: 'user', logBody: false }
    }
    if (path.includes('/logout') && method === 'POST') {
        return { action: 'logout', resourceType: 'user' }
    }
    if (path.includes('/register') && method === 'POST') {
        return { action: 'register', resourceType: 'user', logBody: true }
    }

    // Appointments
    if (path.includes('/book-appointment') && method === 'POST') {
        return { action: 'appointment_book', resourceType: 'appointment', logBody: true }
    }
    if (path.includes('/cancel-appointment') && method === 'POST') {
        return { action: 'appointment_cancel', resourceType: 'appointment', logBody: false }
    }

    // Payments
    if (path.includes('/payment-razorpay') && method === 'POST') {
        return { action: 'payment_initiate', resourceType: 'payment', logBody: false }
    }
    if (path.includes('/verifyRazorpay') && method === 'POST') {
        return { action: 'payment_verify', resourceType: 'payment', logBody: false }
    }

    // Refunds
    if (path.includes('/request-refund') && method === 'POST') {
        return { action: 'refund_request', resourceType: 'refund', logBody: true }
    }
    if (path.includes('/process-refund') && method === 'POST') {
        return { action: 'refund_process', resourceType: 'refund', logBody: false }
    }

    // Profile
    if (path.includes('/update-profile') && method === 'POST') {
        return { action: 'profile_update', resourceType: 'user', extractChanges: true }
    }

    // Reviews
    if (path.includes('/submit-rating') && method === 'POST') {
        return { action: 'review_submit', resourceType: 'review', logBody: true }
    }

    // Doctor operations (admin)
    if (path.includes('/add-doctor') && method === 'POST') {
        return { action: 'doctor_create', resourceType: 'doctor', logBody: true }
    }
    if (path.includes('/doctor-list') && method === 'POST') {
        return { action: 'doctor_update', resourceType: 'doctor', extractChanges: true }
    }

    // Messages
    if (path.includes('/send-message')) {
        return { action: 'message_send', resourceType: 'message', logBody: false }
    }

    // Calls
    if (path.includes('/call')) {
        return { action: 'call_start', resourceType: 'call', logBody: false }
    }

    return null
}

/**
 * Sanitize sensitive data from request body
 */
const sanitizeBody = (body) => {
    if (!body) return {}
    
    const sanitized = { ...body }
    const sensitiveFields = ['password', 'token', 'secret', 'apikey', 'refreshtoken', 'accesstoken']
    
    Object.keys(sanitized).forEach(key => {
        if (sensitiveFields.includes(key.toLowerCase())) {
            sanitized[key] = '***REDACTED***'
        }
    })
    
    return sanitized
}

/**
 * Extract what changed in an update operation
 */
const extractChanges = (body) => {
    if (!body) return {}
    
    const excludeFields = ['password', 'token', '__v', '_id', 'createdAt']
    const changes = {}
    
    Object.keys(body).forEach(key => {
        if (!excludeFields.includes(key)) {
            changes[key] = body[key]
        }
    })
    
    return changes
}

/**
 * Determine response status for logging
 */
const getResponseStatus = (statusCode) => {
    if (statusCode >= 200 && statusCode < 300) return 'success'
    if (statusCode >= 400 && statusCode < 500) return 'failure'
    if (statusCode >= 500) return 'error'
    return 'unknown'
}

/**
 * Log specific action with context
 */
export const logAuditAction = async (userId, action, resourceType, resourceId, details = {}) => {
    try {
        await auditLogModel.create({
            userId,
            action,
            resourceType,
            resourceId,
            statusCode: 200,
            responseStatus: 'success',
            userRole: details.role,
            ipAddress: details.ipAddress,
            changes: details.changes || null,
            duration: details.duration || 0
        })
    } catch (error) {
        console.error('Failed to log audit action:', error.message)
    }
}

/**
 * Retrieve audit logs with filters
 */
export const getAuditLogs = async (filters = {}) => {
    const {
        userId,
        action,
        resourceType,
        days = 30,
        limit = 100,
        skip = 0
    } = filters

    const query = {}
    
    if (userId) query.userId = userId
    if (action) query.action = action
    if (resourceType) query.resourceType = resourceType
    
    // Filter by date range
    if (days) {
        query.timestamp = {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
    }

    const logs = await auditLogModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ timestamp: -1 })
        .lean()

    const total = await auditLogModel.countDocuments(query)

    return {
        logs,
        total,
        pages: Math.ceil(total / limit)
    }
}

export default {
    auditLog,
    logAuditAction,
    getAuditLogs
}
