import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema({
    tokenId: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true },
    subjectId: { type: String, required: true },
    role: { type: String, enum: ['user', 'doctor', 'admin'], required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null }
}, { timestamps: true })

const refreshTokenModel = mongoose.models.refreshToken || mongoose.model('refreshToken', refreshTokenSchema)
export default refreshTokenModel
