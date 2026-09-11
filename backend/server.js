import 'dotenv/config'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import { validateEnv } from './config/env.js'
import { app, allowedOrigins } from './app.js'
import registerSocketHandlers from './sockets/socketServer.js'

validateEnv()

const port = process.env.PORT || 5000
const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
})

registerSocketHandlers(io)

export { app, httpServer }

const startServer = async () => {
    try {
        await connectDB()
        connectCloudinary()
        httpServer.listen(port, () => console.log(`Server started on http://localhost:${port}`))
    } catch (error) {
        console.error('[Server] Startup failed:', error.message)
        process.exitCode = 1
    }
}

if (process.env.NODE_ENV !== 'test' && !process.argv.includes('--test')) startServer()

const shutdown = async signal => {
    console.log(`[Server] ${signal} received — shutting down `)
    try {
        await new Promise(resolve => httpServer.close(resolve))
        await mongoose.connection.close()
        console.log('[Server] HTTP and MongoDB connections closed')
    } finally {
        process.exit(0)
    }
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })
