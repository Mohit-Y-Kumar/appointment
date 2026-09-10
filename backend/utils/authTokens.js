import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import refreshTokenModel from '../models/refreshTokenModel.js'

const isProduction = process.env.NODE_ENV === 'production'
const accessMaxAge = 15 * 60 * 1000
const refreshMaxAge = 7 * 24 * 60 * 60 * 1000

export const cookieNames = role => role === 'admin'
    ? { access: 'adminAccessToken', refresh: 'adminRefreshToken' }
    : role === 'doctor'
        ? { access: 'doctorAccessToken', refresh: 'doctorRefreshToken' }
        : { access: 'accessToken', refresh: 'refreshToken' }

export const cookieOptions = (maxAge, path = '/') => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge,
    path
})

export const refreshCookieOptions = maxAge => cookieOptions(maxAge, '/api')

export const issueTokens = async ({ subjectId, role, email, familyId, session }) => {
    const tokenId = crypto.randomUUID()
    const accessToken = jwt.sign(
        { id: subjectId, role, ...(email ? { email } : {}) },
        process.env.JWT_SECRET,
        { expiresIn: '15m', jwtid: tokenId }
    )
    const tokenFamilyId = familyId || crypto.randomUUID()
    const refreshToken = crypto.randomBytes(48).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const refreshRecord = new refreshTokenModel({
        tokenId,
        familyId: tokenFamilyId,
        tokenHash,
        subjectId: String(subjectId),
        role,
        expiresAt: new Date(Date.now() + refreshMaxAge)
    })
    await refreshRecord.save({ session })
    return { accessToken, refreshToken, tokenId }
}

export const hashRefreshToken = token => crypto.createHash('sha256').update(token).digest('hex')
export { accessMaxAge, refreshMaxAge }
