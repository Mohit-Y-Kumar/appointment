import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { setAuthCookies } from './authController.js'
import { issueTokens } from '../utils/authTokens.js'

export const loginAdmin = async (req, res) => {
    let session
    try {
        const { email, password } = req.body
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' })
        
        // Validate email
        if (email !== process.env.ADMIN_EMAIL) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' })
        }

        // Admin authentication requires a bcrypt hash; plaintext credentials are not accepted.
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
        if (!adminPasswordHash) {
            console.error('[loginAdmin] ADMIN_PASSWORD_HASH is not configured')
            return res.status(500).json({ success: false, message: 'Internal server error.' })
        }

        let isPasswordValid = false
        try {
            isPasswordValid = await bcrypt.compare(password, adminPasswordHash)
        } catch (err) {
            console.error('[loginAdmin] Error comparing bcrypt hash:', err.message)
        }

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' })
        }

        // Use session for transaction safety
        session = await mongoose.startSession()
        let tokens
        await session.withTransaction(async () => {
            tokens = await issueTokens({ subjectId: email, role: 'admin', session })
        })

        setAuthCookies(res, tokens, 'admin')
        return res.json({ success: true })
    } catch (error) {
        console.error('[loginAdmin]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    } finally {
        if (session) await session.endSession()
    }
}