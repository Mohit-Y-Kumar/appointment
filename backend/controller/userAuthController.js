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

export const buildAuthEmailHtml = ({ title, name, otp, actionLabel, link, description, expiryText }) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto;">
        <h2 style="margin-bottom: 16px; color: #0f172a;">${title}</h2>
        <p>Hi ${name},</p>
        <p>${description}</p>
        <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center;">
            <div style="font-size: 12px; letter-spacing: 1px; color: #475569; text-transform: uppercase; margin-bottom: 8px;">OTP</div>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a;">${otp}</div>
        </div>
        <p>
            <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                ${actionLabel}
            </a>
        </p>
        <p>Or copy and paste this link:</p>
        <p><a href="${link}">${link}</a></p>
        <p>${expiryText}</p>
        <p>Best regards,<br/>DocNest Team</p>
    </div>
`

const generateOtp = () => crypto.randomInt(100000, 1000000).toString()

export const hashOtp = (value) => crypto.createHash('sha256').update(String(value).trim()).digest('hex')
export const matchesOtp = (candidate, storedHash) => {
    if (!candidate || !storedHash) return false
    return hashOtp(candidate) === storedHash
}

const sendAuthEmail = async ({ to, subject, name, otp, actionLabel, link, description, expiryText }) => {
    try {
        return await sendMail({
            to,
            subject,
            html: buildAuthEmailHtml({ title: subject, name, otp, actionLabel, link, description, expiryText })
        })
    } catch (error) {
        logError(error, { action: 'sendAuthEmail' })
        return false
    }
}

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
        const otpCode = generateOtp()
        
        const user = await new userModel({ 
            name, 
            email, 
            password: hashPassword,
            emailVerified: false,
            verificationToken,
            verificationTokenExpiry: tokenExpiry,
            verificationOtp: hashOtp(otpCode),
            verificationOtpExpiry: new Date(Date.now() + 15 * 60 * 1000)
        }).save()
        
        // Send verification email in the background so the user is not blocked while SMTP is slow or unavailable.
        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}&email=${email}`
        void sendAuthEmail({
            to: email,
            subject: 'Verify Your DocNest Account',
            name,
            otp: otpCode,
            actionLabel: 'Verify Email',
            link: verificationLink,
            description: 'Thank you for registering with DocNest. Use the OTP below to verify your email address, or use the link below to confirm instantly.',
            expiryText: 'This OTP and link expire in 24 hours.'
        }).then((emailSent) => {
            if (!emailSent) {
                logAuthEvent('register_email_failed', user._id, 'user', { email })
                return
            }
            logAuthEvent('register_email_sent', user._id, 'user', { email })
        })

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
        const { token, email, otp } = req.body

        if ((!token && !otp) || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Verification code or token and email are required.' 
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

        let isValid = false
        if (token) {
            if (!user.verificationToken || user.verificationToken !== token) {
                logAuthEvent('verify_email_failed_invalid_token', user._id, 'user', { email })
                return res.status(401).json({ success: false, message: 'Invalid verification token.' })
            }
            if (user.verificationTokenExpiry < new Date()) {
                logAuthEvent('verify_email_failed_token_expired', user._id, 'user', { email })
                return res.status(401).json({ success: false, message: 'Verification token has expired. Please register again.' })
            }
            isValid = true
        }

        if (otp) {
            const normalizedOtp = String(otp).trim()
            if (!matchesOtp(normalizedOtp, user.verificationOtp)) {
                logAuthEvent('verify_email_failed_invalid_otp', user._id, 'user', { email })
                return res.status(401).json({ success: false, message: 'Invalid verification code.' })
            }
            if (!user.verificationOtpExpiry || user.verificationOtpExpiry < new Date()) {
                logAuthEvent('verify_email_failed_otp_expired', user._id, 'user', { email })
                return res.status(401).json({ success: false, message: 'Verification code has expired. Please request a new one.' })
            }
            isValid = true
        }

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid verification details.' })
        }

        user.emailVerified = true
        user.verificationToken = null
        user.verificationTokenExpiry = null
        user.verificationOtp = null
        user.verificationOtpExpiry = null
        await user.save()

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
        const otpCode = generateOtp()
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
        user.resetPasswordTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)
        user.resetPasswordOtp = hashOtp(otpCode)
        user.resetPasswordOtpExpiry = new Date(Date.now() + 15 * 60 * 1000)
        await user.save()

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
        void sendAuthEmail({
            to: email,
            subject: 'Reset Your DocNest Password',
            name: user.name,
            otp: otpCode,
            actionLabel: 'Reset Password',
            link: resetLink,
            description: 'Use the OTP below to confirm your reset request, or open the secure link below to set a new password.',
            expiryText: 'This OTP and link expire in 1 hour.'
        }).then((emailSent) => {
            if (!emailSent) {
                logAuthEvent('password_reset_email_failed', user._id, 'user', { email })
                return
            }
            logAuthEvent('password_reset_requested', user._id, 'user', { email })
        })
        return res.json(response)
    } catch (error) {
        logError(error, { action: 'forgotPassword' })
        return res.json(response)
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, email, password, otp } = req.body
        if ((!token && !otp) || !email || !password) return res.status(400).json({ success: false, message: 'Reset token or code, email, and new password are required.' })
        try {
            validateEmail(email)
            validatePassword(password)
        } catch (validationErr) {
            return res.status(validationErr.statusCode).json({ success: false, message: validationErr.message })
        }

        const query = { email }
        const update = {
            $set: {
                password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
                resetPasswordToken: null,
                resetPasswordTokenExpiry: null,
                resetPasswordOtp: null,
                resetPasswordOtpExpiry: null
            }
        }

        if (token) {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
            query.resetPasswordToken = tokenHash
            query.resetPasswordTokenExpiry = { $gt: new Date() }
        }

        if (otp) {
            query.resetPasswordOtp = hashOtp(String(otp).trim())
            query.resetPasswordOtpExpiry = { $gt: new Date() }
        }

        const user = await userModel.findOneAndUpdate(query, update, { new: true })
        if (!user) return res.status(401).json({ success: false, message: 'Invalid or expired password reset link or code.' })

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
        const otpCode = generateOtp()
        user.verificationToken = verificationToken
        user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
        user.verificationOtp = hashOtp(otpCode)
        user.verificationOtpExpiry = new Date(Date.now() + 15 * 60 * 1000)
        await user.save()

        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`
        void sendAuthEmail({
            to: email,
            subject: 'Verify Your DocNest Account',
            name: user.name,
            otp: otpCode,
            actionLabel: 'Verify Email',
            link: verificationLink,
            description: 'Use the OTP below to verify your email address, or click the secure link below to confirm instantly.',
            expiryText: 'This OTP and link expire in 24 hours.'
        }).then((emailSent) => {
            if (!emailSent) {
                logAuthEvent('verification_email_failed', user._id, 'user', { email })
                return
            }
            logAuthEvent('verification_email_resent', user._id, 'user', { email })
        })

        return res.json({ success: true, message: 'Verification email sent successfully.' })
    } catch (error) {
        logError(error, { action: 'resendVerificationEmail' })
        return res.status(500).json({ success: false, message: 'Unable to resend verification email.' })
    }
}