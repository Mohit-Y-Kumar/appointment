import mongoose from 'mongoose'

const webhookEventSchema = new mongoose.Schema(
    {
        webhookId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        eventType: {
            type: String,
            required: true,
            enum: ['payment.captured', 'order.paid', 'payment.failed', 'refund.created']
        },
        orderId: {
            type: String,
            required: true,
            index: true
        },
        paymentId: String,
        status: {
            type: String,
            enum: ['processing', 'completed', 'failed'],
            default: 'processing'
        },
        processedAt: {
            type: Date,
            default: null
        },
        error: String,
        rawPayload: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
            expire: 30 * 24 * 60 * 60 
        }
    },
    { timestamps: true }
)

const webhookEventModel = mongoose.model('webhookEvent', webhookEventSchema)

export default webhookEventModel
