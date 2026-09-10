import doctorModel from '../models/doctorModel.js'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { setAuthCookies } from './authController.js'
import { issueTokens } from '../utils/authTokens.js'
import { logAuthEvent, logError } from '../config/logger.js'

export const loginDoctor = async (req, res) => {
	let session
	try {
		const { email, password } = req.body
		if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' })

		const doctor = await doctorModel.findOne({ email })
		if (!doctor || !(await bcrypt.compare(password, doctor.password))) {
			return res.status(401).json({ success: false, message: 'Invalid email or password.' })
		}

		// Check if email is verified
		if (!doctor.emailVerified) {
			return res.status(403).json({ success: false, message: 'Please verify your email address before logging in.' })
		}

		// Use session for transaction safety
		session = await mongoose.startSession()
		let tokens
		await session.withTransaction(async () => {
			tokens = await issueTokens({ subjectId: doctor._id, role: 'doctor', session })
		})

		setAuthCookies(res, tokens, 'doctor')
		logAuthEvent('login_success', doctor._id, 'doctor', { email })
		return res.json({ success: true })
	} catch (error) {
		console.error('[loginDoctor]', error.message)
		logError(error, { action: 'loginDoctor' })
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	} finally {
		if (session) await session.endSession()
	}
}
