import mongoose from 'mongoose'

const refundSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'appointment',
            required: true,
            unique: true,
            index: true
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'payment',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        docId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'doctor',
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        reason: {
            type: String,
            enum: ['appointment_cancelled', 'user_request', 'admin_action', 'other'],
            default: 'user_request'
        },
        description: String,
        razorpay_refund_id: String,
        razorpay_payment_id: String,
        status: {
            type: String,
            enum: ['initiated', 'processing', 'completed', 'failed'],
            default: 'initiated',
            index: true
        },
        failureReason: String,
        requestedAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        processedAt: Date,
        receipt_url: String
    },
    { timestamps: true }
)

const refundModel = mongoose.model('refund', refundSchema)

export default refundModel
