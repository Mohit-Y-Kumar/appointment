import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import crypto from 'crypto'
import refreshTokenModel from '../models/refreshTokenModel.js'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import { cookieNames, cookieOptions, refreshCookieOptions, hashRefreshToken, issueTokens, accessMaxAge, refreshMaxAge } from '../utils/authTokens.js'

const rotationGracePeriodMs = 30 * 1000

const getRefreshToken = (req, role) => {
    const header = req.headers.cookie || ''
    const name = cookieNames(role).refresh
    const value = header.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))
    if (!value) return null
    try {
        return decodeURIComponent(value.slice(`${name}=`.length)) || null
    } catch {
        return null
    }
}

export const setAuthCookies = (res, tokens, role) => {
    const names = cookieNames(role)
    const roles = ['user', 'doctor', 'admin']
    // Clear current and legacy cookie paths before issuing one canonical session.
    for (const existingRole of roles) {
        const existingNames = cookieNames(existingRole)
        res.clearCookie(existingNames.access, cookieOptions(0, '/'))
        res.clearCookie(existingNames.refresh, refreshCookieOptions(0))
        res.clearCookie(existingNames.refresh, cookieOptions(0, '/'))
    }
    res.clearCookie(names.access, cookieOptions(0))
    res.clearCookie(names.refresh, refreshCookieOptions(0))
    res.clearCookie(names.refresh, cookieOptions(0, '/'))
    res.cookie(names.access, tokens.accessToken, cookieOptions(accessMaxAge))
    res.cookie(names.refresh, tokens.refreshToken, refreshCookieOptions(refreshMaxAge))
    res.cookie('docnestRole', role, { ...cookieOptions(refreshMaxAge), httpOnly: false })
}

export const clearAuthCookies = (res, role) => {
    const names = cookieNames(role)
    res.clearCookie(names.access, cookieOptions(0))
    res.clearCookie(names.refresh, refreshCookieOptions(0))
    res.clearCookie(names.refresh, cookieOptions(0, '/'))
    res.clearCookie('docnestRole', cookieOptions(0))
}

export const revokeRefreshTokenFamily = async ({ familyId, role, model = refreshTokenModel }) => {
    if (!familyId) return 0
    const result = await model.updateMany(
        { familyId, role, revokedAt: null },
        { revokedAt: new Date() }
    )
    return result.modifiedCount ?? 0
}

export const refreshForRole = role => async (req, res) => {
    let session
    try {
        const current = getRefreshToken(req, role)
        if (!current) {
            console.error(`[refresh] ${role}: Refresh token missing from cookies`)
            return res.status(401).json({ success: false, message: 'Refresh token missing.' })
        }
        session = await mongoose.startSession()

        let record
        let issuedTokens
        let failureMessage
        let preserveCookies = false
        let alreadyRotated = false
        await session.withTransaction(async () => {
            const tokenHash = hashRefreshToken(current)
            const stored = await refreshTokenModel.findOne({ tokenHash }).session(session)
            if (!stored) {
                console.error(`[refresh] ${role}: Token not found in DB. Hash: ${tokenHash.substring(0, 16)}...`)
                failureMessage = 'Invalid refresh token.'
                return
            }
            if (stored.revokedAt) {
                const recentlyRotated = Date.now() - stored.revokedAt.getTime() <= rotationGracePeriodMs
                if (recentlyRotated) {
                    // A second request can arrive while the first rotation response is in flight.
                    // Keep the replacement cookie from the successful request intact.
                    preserveCookies = true
                    alreadyRotated = true
                    return
                }
                console.error(`[refresh] ${role}: Token reuse detected after grace period. Revoking family ${stored.familyId}`)
                await refreshTokenModel.updateMany(
                    { familyId: stored.familyId, revokedAt: null },
                    { revokedAt: new Date() },
                    { session }
                )
                failureMessage = 'Refresh token reuse detected.'
                return
            }
            if (stored.role !== role) {
                console.error(`[refresh] ${role}: Role mismatch. Token role: ${stored.role}, Expected: ${role}`)
                failureMessage = 'Invalid refresh token.'
                return
            }
            if (stored.expiresAt <= new Date()) {
                console.error(`[refresh] ${role}: Token expired at ${stored.expiresAt}`)
                await refreshTokenModel.updateOne({ _id: stored._id }, { revokedAt: new Date() }, { session })
                failureMessage = 'Invalid refresh token.'
                return
            }

            record = stored
            if (!record.familyId) record.familyId = crypto.randomUUID()
            record.revokedAt = new Date()
            await record.save({ session })

            if (record.role === 'user' && !await userModel.exists({ _id: record.subjectId }).session(session)) {
                console.error(`[refresh] ${role}: User account ${record.subjectId} no longer exists`)
                failureMessage = 'Account no longer exists.'
                return
            }
            if (record.role === 'doctor' && !await doctorModel.exists({ _id: record.subjectId }).session(session)) {
                console.error(`[refresh] ${role}: Doctor account ${record.subjectId} no longer exists`)
                failureMessage = 'Account no longer exists.'
                return
            }
            if (record.role === 'admin' && record.subjectId !== process.env.ADMIN_EMAIL) {
                console.error(`[refresh] ${role}: Email mismatch. Token email: "${record.subjectId}", ENV ADMIN_EMAIL: "${process.env.ADMIN_EMAIL}"`)
                failureMessage = 'Account no longer exists.'
                return
            }

            const tokens = await issueTokens({
                subjectId: record.subjectId,
                role: record.role,
                familyId: record.familyId,
                session
            })
            issuedTokens = tokens
        })

        if (alreadyRotated) {
            return res.json({ success: true, alreadyRotated: true })
        }
        if (failureMessage || !record || !issuedTokens) {
            if (!preserveCookies) clearAuthCookies(res, role)
            console.error(`[refresh] ${role}: Failed - ${failureMessage || 'Invalid refresh token.'}`)
            return res.status(401).json({ success: false, message: failureMessage || 'Invalid refresh token.' })
        }
        console.log(`[refresh] ${role}: Success - New tokens issued for ${record.subjectId}`)
        setAuthCookies(res, issuedTokens, role)
        return res.json({ success: true })
    } catch (error) {
        await session?.abortTransaction().catch(() => {})
        console.error('[refresh]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    } finally {
        await session?.endSession()
    }
}

export const logoutForRole = role => async (req, res) => {
    try {
        const current = getRefreshToken(req, role)
        if (current) {
            const tokenHash = hashRefreshToken(current)
            const currentRecord = await refreshTokenModel.findOne({ tokenHash, role, revokedAt: null })
            if (currentRecord?.familyId) {
                await revokeRefreshTokenFamily({ familyId: currentRecord.familyId, role })
            } else {
                await refreshTokenModel.updateOne({ tokenHash, role, revokedAt: null }, { revokedAt: new Date() })
            }
        }
        clearAuthCookies(res, role)
        return res.json({ success: true })
    } catch (error) {
        console.error('[logout]', error.message)
        clearAuthCookies(res, role)
        return res.json({ success: true })
    }
}
