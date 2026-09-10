import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            index: true,
            sparse: true
        },
        userEmail: String,
        userRole: {
            type: String,
            enum: ['user', 'doctor', 'admin'],
            index: true
        },
        action: {
            type: String,
            required: true,
            index: true,
            enum: [
                'login', 'logout', 'register',
                'appointment_book', 'appointment_cancel', 'appointment_complete',
                'payment_initiate', 'payment_verify', 'refund_request', 'refund_process',
                'profile_update', 'password_change',
                'message_send', 'call_start', 'call_end',
                'doctor_create', 'doctor_update', 'doctor_delete',
                'review_submit', 'review_update',
                'admin_dashboard_view', 'admin_user_manage'
            ]
        },
        resourceType: {
            type: String,
            enum: ['user', 'doctor', 'appointment', 'payment', 'refund', 'message', 'call', 'review'],
            index: true
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
            sparse: true
        },
        method: String,
        path: String,
        statusCode: {
            type: Number,
            index: true
        },
        ipAddress: {
            type: String,
            index: true
        },
        userAgent: String,
        requestBody: {
            type: mongoose.Schema.Types.Mixed,
            select: false  // Don't include by default to reduce size
        },
        responseStatus: {
            type: String,
            enum: ['success', 'failure', 'error'],
            index: true
        },
        errorMessage: String,
        changes: {
            type: mongoose.Schema.Types.Mixed,
            sparse: true  // Only for update operations
        },
        duration: {
            type: Number,
            description: 'Request duration in milliseconds'
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
            expires: 90 * 24 * 60 * 60  
        }
    },
    { timestamps: true }
)

// Compound indexes for audit queries
auditLogSchema.index({ userId: 1, timestamp: -1 })
auditLogSchema.index({ userRole: 1, action: 1, timestamp: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 })
auditLogSchema.index({ action: 1, statusCode: 1, timestamp: -1 })

const auditLogModel = mongoose.model('auditLog', auditLogSchema)

export default auditLogModel
