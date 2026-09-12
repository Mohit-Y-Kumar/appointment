import express from 'express'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import userRouter from './routes/userRoute.js'
import reviewRouter from './routes/reviewRoute.js'
import chatRouter from './routes/chatRoute.js'
import callRouter from './routes/callRoute.js'
import { csrfTokenGenerator, csrfTokenValidator } from './middleware/csrf.js'
import { logRequest, logError } from './config/logger.js'
import { auditLog } from './middleware/auditLogger.js'
import logger from './config/logger.js'
import authAdmin from './middleware/authAdmin.js'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

const app = express()

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
}

app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
            fontSrc: ["'self'", 'data:', 'https:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    }
}))
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'X-CSRF-Token'],
    credentials: true
}))

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
}))

app.use(express.json({
    limit: '10mb',
    verify: (req, _res, buffer) => {
        if (req.originalUrl === '/api/user/payment/webhook') req.rawBody = Buffer.from(buffer)
    }
}))


app.use(logRequest)


app.use(auditLog)

app.use(csrfTokenGenerator)
app.use(csrfTokenValidator)

app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)
app.use('/api/user', userRouter)
app.use('/api/reviews', reviewRouter)
app.use('/api/chat', chatRouter)
app.use('/api/calls', callRouter)

app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        service: 'docnest-backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
})

app.get('/ready', async (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1
    res.status(dbReady ? 200 : 503).json({
        success: dbReady,
        status: dbReady ? 'ready' : 'not-ready',
        database: dbReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    })
})

app.get('/metrics', authAdmin, (_req, res) => {
    const memory = process.memoryUsage()
    res.status(200).json({
        success: true,
        service: 'docnest-backend',
        uptime: process.uptime(),
        process: {
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version
        },
        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external
        },
        database: {
            readyState: mongoose.connection.readyState,
            name: mongoose.connection.name || null
        },
        timestamp: new Date().toISOString()
    })
})

app.get('/api/docs', (_req, res) => {
    res.status(200).json({
        openapi: '3.0.0',
        info: {
            title: 'DocNest API',
            version: '1.0.0',
            description: 'Production-ready API documentation for DocNest medical appointment platform'
        },
        servers: [{ url: process.env.APP_URL || 'http://localhost:4000' }],
        paths: {
            '/health': { get: { summary: 'Health check endpoint' } },
            '/ready': { get: { summary: 'Readiness check for database and app dependencies' } },
            '/metrics': { get: { summary: 'Runtime metrics and memory usage' } },
            '/api/user/login': { post: { summary: 'User login' } },
            '/api/user/register': { post: { summary: 'User registration' } },
            '/api/user/book-appointment': { post: { summary: 'Book appointment' } },
            '/api/user/payment-razorpay': { post: { summary: 'Create Razorpay order' } },
            '/api/user/verifyRazorpay': { post: { summary: 'Verify payment' } },
            '/api/doctor/appointments': { get: { summary: 'Doctor appointments' } },
            '/api/admin/dashboard': { get: { summary: 'Admin dashboard' } }
        }
    })
})

app.get('/', (_req, res) => res.send(' DocNest API running'))

app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' })
})

app.use((err, req, res, _next) => {
    logError(err, {
        path: req.path,
        method: req.method,
        userId: req.userId
    })
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500
    res.status(status).json({
        success: false,
        message: status < 500 ? err.message : 'Internal server error.'
    })
})

export { app, allowedOrigins, logger }