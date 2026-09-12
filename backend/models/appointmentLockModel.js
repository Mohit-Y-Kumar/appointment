import mongoose from 'mongoose'

const appointmentLockSchema = new mongoose.Schema(
    {
        docId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'doctor',
            required: true,
            index: true
        },
        slotDate: {
            type: String,
            required: true,
            index: true
        },
        slotTime: {
            type: String,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        status: {
            type: String,
            enum: ['reserved', 'confirmed', 'released'],
            default: 'reserved'
        },
        reservedAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
            expires: 0  
        }
    },
    { timestamps: true }
)

appointmentLockSchema.index(
    { docId: 1, slotDate: 1, slotTime: 1 },
    { 
        unique: true, 
        sparse: true,
        partialFilterExpression: { status: { $in: ['reserved', 'confirmed'] } }
    }
)

const appointmentLockModel = mongoose.model('appointmentLock', appointmentLockSchema)

export default appointmentLockModel
