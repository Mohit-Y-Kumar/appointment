import jwt from 'jsonwebtoken'
import { cookieNames } from '../utils/authTokens.js'
import refreshTokenModel from '../models/refreshTokenModel.js'

const authAdmin = async (req, res, next) => {
    try {
        if (!req.headers.cookie?.includes(`${cookieNames('admin').access}=`)) {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }

        const cookieToken = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieNames('admin').access}=`))
        const token = cookieToken ? decodeURIComponent(cookieToken.slice(`${cookieNames('admin').access}=`.length)) : null
        if (!token || token === 'false') {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Admin token payload must contain role: 'admin'
        if (decoded.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Forbidden: Admin access only' })
        }
        if (decoded.id !== process.env.ADMIN_EMAIL) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' })
        }
        if (!decoded.jti || !await refreshTokenModel.exists({
            tokenId: decoded.jti, subjectId: process.env.ADMIN_EMAIL, role: 'admin',
            revokedAt: null, expiresAt: { $gt: new Date() }
        })) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' })
        }

        next()
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
}

export default authAdmin
