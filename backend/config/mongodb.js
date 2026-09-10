import mongoose from 'mongoose'

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI

    if (!uri) {
        throw new Error('MONGO_URI or MONGODB_URI is not defined in environment variables')
    }

    try {
        mongoose.connection.on('connected',    () => console.log('[MongoDB] Connected'))
        mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Disconnected'))
        mongoose.connection.on('error',        (err) => console.error('[MongoDB] Error:', err.message))

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        })

        if (process.env.MONGO_TRANSACTIONS_REQUIRED !== 'false') {
            const hello = await mongoose.connection.db.admin().command({ hello: 1 })
            if (!hello.setName && hello.msg !== 'isdbgrid') {
                throw new Error('MongoDB replica set or sharded deployment is required for booking transactions')
            }
        }
    } catch (error) {
        console.error('[MongoDB] Connection failed:', error.message)
        throw error
    }
}

export default connectDB
