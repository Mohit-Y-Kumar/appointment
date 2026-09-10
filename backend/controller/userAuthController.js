import validator from 'validator'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import userModel from '../models/userModel.js'
import refreshTokenModel from '../models/refreshTokenModel.js'
import { setAuthCookies } from './authController.js'
import { issueTokens } from '../utils/authTokens.js'
import { validateRequired, validateEmail, validatePassword, formatErrorResponse } from '../utils/validationErrors.js'
import { logAuthEvent, logError } from '../config/logger.js'
import { sendMail } from '../config/mailer.js'

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body
        
        // Validate required fields
        try {
            validateRequired(['name', 'email', 'password'], req.body)
            validateEmail(email)
            validatePassword(password)
        } catch (validationErr) {
            return res.status(validationErr.statusCode).json({ 
                success: false, 
                message: validationErr.message 
            })
        }

        // Check if account already exists
        const existing = await userModel.findOne({ email })
        if (existing) {
            logAuthEvent('register_failed_duplicate', null, 'user', { email })
            return res.status(409).json({ 
                success: false, 
                message: 'An account with this email already exists. Please log in or use a different email.' 
            })
        }

        const hashPassword = await bcrypt.hash(password, await bcrypt.genSalt(10))
        
        // Generate verification token (valid for 24 hours)
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
        
        const user = await new userModel({ 
            name, 
            email, 
            password: hashPassword,
            emailVerified: false,
            verificationToken,
            verificationTokenExpiry: tokenExpiry
        }).save()
        
        // Send verification email
        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}&email=${email}`
        const emailSent = await sendMail({
            to: email,
            subject: 'Verify Your DocNest Account',
            html: `
                <h2>Email Verification</h2>
                <p>Hi ${name},</p>
                <p>Thank you for registering with DocNest. Please verify your email address to complete your registration.</p>
                <p>
                    <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Verify Email
                    </a>
                </p>
                <p>Or copy and paste this link: ${verificationLink}</p>
                <p>This link will expire in 24 hours.</p>
                <p>Best regards,<br/>DocNest Team</p>
            `
        })
        
        if (!emailSent) {
            logAuthEvent('register_email_failed', user._id, 'user', { email })
            return res.status(503).json({ success: false, message: 'Account created, but the verification email could not be sent. Please use resend verification.' })
        }

        logAuthEvent('register_success', user._id, 'user', { email })
        return res.status(201).json({ 
            success: true,
            message: 'Registration successful. Please check your email to verify your account.' 
        })
    } catch (error) {
        logError(error, { action: 'registerUser' })
        return res.status(500).json({ success: false, message: 'Failed to create account. Please try again later.' })
    }
}

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        
        // Validate required fields
        try {
            validateRequired(['email', 'password'], req.body)
            validateEmail(email)
        } catch (validationErr) {
            return res.status(validationErr.statusCode).json({ 
                success: false, 
                message: validationErr.message 
            })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            logAuthEvent('login_failed_user_not_found', null, 'user', { email })
            return res.status(401).json({ 
                success: false, 
                message: 'Email or password is incorrect. Please check and try again.' 
            })
        }

        // Check if email is verified
        if (!user.emailVerified) {
            logAuthEvent('login_failed_email_not_verified', user._id, 'user', { email })
            return res.status(403).json({ 
                success: false, 
                message: 'Please verify your email address before logging in.' 
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            logAuthEvent('login_failed_invalid_password', user._id, 'user', { email })
            return res.status(401).json({ 
                success: false, 
                message: 'Email or password is incorrect. Please check and try again.' 
            })
        }

        const tokens = await issueTokens({ subjectId: user._id, role: 'user' })
        setAuthCookies(res, tokens, 'user')
        
        logAuthEvent('login_success', user._id, 'user', { email })
        return res.json({ success: true })
    } catch (error) {
        logError(error, { action: 'loginUser' })
        return res.status(500).json({ success: false, message: 'Login failed. Please try again later.' })
    }
}

export const verifyUserEmail = async (req, res) => {
    try {
        const { token, email } = req.body

        if (!token || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Verification token and email are required.' 
            })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            logAuthEvent('verify_email_failed_user_not_found', null, 'user', { email })
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            })
        }

        // Check if already verified
        if (user.emailVerified) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is already verified.' 
            })
        }

        // Check if token is valid and not expired
        if (!user.verificationToken || user.verificationToken !== token) {
            logAuthEvent('verify_email_failed_invalid_token', user._id, 'user', { email })
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid verification token.' 
            })
        }

        if (user.verificationTokenExpiry < new Date()) {
            logAuthEvent('verify_email_failed_token_expired', user._id, 'user', { email })
            return res.status(401).json({ 
                success: false, 
                message: 'Verification token has expired. Please register again.' 
            })
        }

        // Mark email as verified and issue tokens
        user.emailVerified = true
        user.verificationToken = null
        user.verificationTokenExpiry = null
        await user.save()

        // Issue tokens
        const tokens = await issueTokens({ subjectId: user._id, role: 'user' })
        setAuthCookies(res, tokens, 'user')

        logAuthEvent('email_verified_success', user._id, 'user', { email })
        return res.json({ 
            success: true, 
            message: 'Email verified successfully. You are now logged in.' 
        })
    } catch (error) {
        logError(error, { action: 'verifyUserEmail' })
        return res.status(500).json({ success: false, message: 'Email verification failed. Please try again later.' })
    }
}

export const forgotPassword = async (req, res) => {
    const response = { success: true, message: 'If an account exists for this email, a password reset link has been sent.' }
    try {
        const { email } = req.body
        try {
            validateRequired(['email'], req.body)
            validateEmail(email)
        } catch (validationErr) {
            return res.status(validationErr.statusCode).json({ success: false, message: validationErr.message })
        }

        const user = await userModel.findOne({ email })
        if (!user || !user.emailVerified) return res.json(response)

        const resetToken = crypto.randomBytes(32).toString('hex')
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
        user.resetPasswordTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)
        await user.save()

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
        await sendMail({
            to: email,
            subject: 'Reset Your DocNest Password',
            html: `<h2>Password Reset</h2><p>Hi ${user.name},</p><p>Use the link below to choose a new password. This link expires in 1 hour.</p><p><a href="${resetLink}">Reset Password</a></p><p>Or copy and paste this link: ${resetLink}</p><p>If you did not request this, you can ignore this email.</p>`
        })
        logAuthEvent('password_reset_requested', user._id, 'user', { email })
        return res.json(response)
    } catch (error) {
        logError(error, { action: 'forgotPassword' })
        return res.json(response)
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, email, password } = req.body
        if (!token || !email || !password) return res.status(400).json({ success: false, message: 'Reset token, email, and new password are required.' })
        try {
            validateEmail(email)
            validatePassword(password)
        } catch (validationErr) {
            return res.status(validationErr.statusCode).json({ success: false, message: validationErr.message })
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10))
        const user = await userModel.findOneAndUpdate(
            { email, resetPasswordToken: tokenHash, resetPasswordTokenExpiry: { $gt: new Date() } },
            { $set: { password: passwordHash, resetPasswordToken: null, resetPasswordTokenExpiry: null } },
            { new: true }
        )
        if (!user) return res.status(401).json({ success: false, message: 'Invalid or expired password reset link.' })

        await refreshTokenModel.updateMany({ subjectId: String(user._id), role: 'user', revokedAt: null }, { revokedAt: new Date() })

        logAuthEvent('password_reset_success', user._id, 'user', { email })
        return res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' })
    } catch (error) {
        logError(error, { action: 'resetPassword' })
        return res.status(500).json({ success: false, message: 'Unable to reset password. Please try again later.' })
    }
}

export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body
        try {
            validateRequired(['email'], req.body)
            validateEmail(email)
        } catch (validationErr) {
            return res.status(validationErr.statusCode).json({ success: false, message: validationErr.message })
        }

        const user = await userModel.findOne({ email })
        if (!user || user.emailVerified) {
            return res.json({ success: true, message: 'If your account needs verification, a new verification email has been sent.' })
        }

        const verificationToken = crypto.randomBytes(32).toString('hex')
        user.verificationToken = verificationToken
        user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await user.save()

        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`
        const emailSent = await sendMail({
            to: email,
            subject: 'Verify Your DocNest Account',
            html: `<h2>Email Verification</h2><p>Hi ${user.name},</p><p><a href="${verificationLink}">Verify Email</a></p><p>This link expires in 24 hours.</p>`
        })
        if (!emailSent) return res.status(503).json({ success: false, message: 'Verification email could not be sent. Please try again later.' })

        logAuthEvent('verification_email_resent', user._id, 'user', { email })
        return res.json({ success: true, message: 'Verification email sent successfully.' })
    } catch (error) {
        logError(error, { action: 'resendVerificationEmail' })
        return res.status(500).json({ success: false, message: 'Unable to resend verification email.' })
    }
}