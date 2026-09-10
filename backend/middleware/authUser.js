import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'
import refreshTokenModel from '../models/refreshTokenModel.js'
import { cookieNames } from '../utils/authTokens.js'

const authUser = async (req, res, next) => {
    try {
        if (!req.headers.cookie?.includes(`${cookieNames('user').access}=`)) {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }

        const cookieToken = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieNames('user').access}=`))
        const token = cookieToken ? decodeURIComponent(cookieToken.slice(`${cookieNames('user').access}=`.length)) : null
        if (!token || token === 'false') {
            return res.status(401).json({ success: false, message: 'Not authorized: Token missing' })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.role !== 'user') {
            return res.status(401).json({ success: false, message: 'User access required.' })
        }
        if (!decoded.jti || !await refreshTokenModel.exists({
            tokenId: decoded.jti, subjectId: String(decoded.id), role: 'user',
            revokedAt: null, expiresAt: { $gt: new Date() }
        })) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' })
        }
        if (!await userModel.exists({ _id: decoded.id })) {
            return res.status(401).json({ success: false, message: 'Invalid participant.' })
        }

        req.userId = decoded.id

        next()
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
}

export default authUser
