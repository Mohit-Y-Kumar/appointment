import jwt from 'jsonwebtoken'
import doctorModel from '../models/doctorModel.js'
import refreshTokenModel from '../models/refreshTokenModel.js'
import { cookieNames } from '../utils/authTokens.js'

const authDoctor = async (req, res, next) => {
    try {
        if (!req.headers.cookie?.includes(`${cookieNames('doctor').access}=`)) {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }

        const cookieToken = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieNames('doctor').access}=`))
        const token = cookieToken ? decodeURIComponent(cookieToken.slice(`${cookieNames('doctor').access}=`.length)) : null
        if (!token || token === 'false') {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.role !== 'doctor') {
            return res.status(401).json({ success: false, message: 'Doctor access required.' })
        }
        if (!decoded.jti || !await refreshTokenModel.exists({
            tokenId: decoded.jti, subjectId: String(decoded.id), role: 'doctor',
            revokedAt: null, expiresAt: { $gt: new Date() }
        })) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' })
        }
        if (!await doctorModel.exists({ _id: decoded.id })) {
            return res.status(401).json({ success: false, message: 'Invalid participant.' })
        }

        req.docId = decoded.id

        next()
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
}

export default authDoctor
