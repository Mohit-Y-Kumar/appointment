import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import { cookieNames } from '../utils/authTokens.js'
import refreshTokenModel from '../models/refreshTokenModel.js'

const authParticipant = async (req, res, next) => {
    try {
        if (!req.headers.cookie?.match(/(?:accessToken|doctorAccessToken)=/)) {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }

        const cookieToken = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieNames('user').access}=`) || item.startsWith(`${cookieNames('doctor').access}=`))
        const cookieName = cookieToken?.split('=')[0]
        const token = cookieToken ? decodeURIComponent(cookieToken.slice(`${cookieName}=`.length)) : null
        if (!token || token === 'false') {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!['user', 'doctor'].includes(decoded.role)) {
            return res.status(401).json({ success: false, message: 'Participant access required.' })
        }
        if (!decoded.jti || !await refreshTokenModel.exists({
            tokenId: decoded.jti, subjectId: String(decoded.id), role: decoded.role,
            revokedAt: null, expiresAt: { $gt: new Date() }
        })) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' })
        }

        const model = decoded.role === 'doctor' ? doctorModel : userModel
        const participant = await model.findById(decoded.id).select('name').lean()
        if (!participant) {
            return res.status(401).json({ success: false, message: 'Invalid participant.' })
        }

        req.participantId = String(decoded.id)
        req.participantRole = decoded.role
        req.participantName = participant.name
        next()
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
}

export default authParticipant
