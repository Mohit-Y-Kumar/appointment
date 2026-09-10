import winston from 'winston'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, '../logs')

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info
        
        // Sanitize sensitive data
        const cleanMeta = sanitizeData(meta)
        
        const metaStr = Object.keys(cleanMeta).length ? 
            ` ${JSON.stringify(cleanMeta)}` : ''
        
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`
    })
)

/**
 * Sanitize sensitive data from logs
 */
const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return data
    
    const sanitized = { ...data }
    const sensitiveKeys = [
        'password', 'token', 'secret', 'apikey', 'authorization',
        'credit_card', 'cvv', 'ssn', 'refreshtoken', 'accesstoken'
    ]
    
    Object.keys(sanitized).forEach(key => {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = '***REDACTED***'
        } else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeData(sanitized[key])
        }
    })
    
    return sanitized
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'docnest-backend' },
    transports: [
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        
        // All logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10
        }),
        
        // Error logs only
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 10
        }),
        
        // Warn logs
        new winston.transports.File({
            filename: path.join(logsDir, 'warn.log'),
            level: 'warn',
            maxsize: 10485760,
            maxFiles: 5
        })
    ]
})

/**
 * Log request details
 */
export const logRequest = (req, res, next) => {
    const start = Date.now()
    
    // Log request
    logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.userId || 'anonymous'
    })
    
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start
        const statusCode = res.statusCode
        
        const logLevel = statusCode >= 500 ? 'error' : 
                        statusCode >= 400 ? 'warn' : 'info'
        
        logger[logLevel]('Response sent', {
            method: req.method,
            path: req.path,
            statusCode,
            duration: `${duration}ms`,
            userId: req.userId || 'anonymous'
        })
    })
    
    next()
}

/**
 * Log authentication events
 */
export const logAuthEvent = (event, userId, role, details = {}) => {
    logger.info('Authentication event', {
        event,
        userId,
        role,
        ...details
    })
}

/**
 * Log payment events
 */
export const logPaymentEvent = (event, paymentId, appointmentId, amount, status, details = {}) => {
    logger.info('Payment event', {
        event,
        paymentId,
        appointmentId,
        amount,
        status,
        ...details
    })
}

/**
 * Log error with context
 */
export const logError = (error, context = {}) => {
    logger.error('Error occurred', {
        message: error.message,
        stack: error.stack,
        ...context
    })
}

/**
 * Log appointment events
 */
export const logAppointmentEvent = (event, appointmentId, userId, docId, details = {}) => {
    logger.info('Appointment event', {
        event,
        appointmentId,
        userId,
        docId,
        ...details
    })
}

/**
 * Log database operations
 */
export const logDatabaseEvent = (event, collection, operation, duration, details = {}) => {
    logger.debug('Database operation', {
        event,
        collection,
        operation,
        duration: `${duration}ms`,
        ...details
    })
}

/**
 * Log security events
 */
export const logSecurityEvent = (event, severity, details = {}) => {
    const level = severity === 'critical' ? 'error' : 
                 severity === 'high' ? 'warn' : 'info'
    
    logger[level]('Security event', {
        event,
        severity,
        timestamp: new Date().toISOString(),
        ...details
    })
}

/**
 * Get logs from file
 */
export const getLogs = (logFile = 'combined.log', lines = 100) => {
    const logPath = path.join(logsDir, logFile)
    
    try {
        if (!fs.existsSync(logPath)) {
            return []
        }
        
        const content = fs.readFileSync(logPath, 'utf8')
        return content.split('\n').slice(-lines).filter(line => line.trim())
    } catch (error) {
        logger.error('Failed to read log file', { error: error.message })
        return []
    }
}

export default logger
