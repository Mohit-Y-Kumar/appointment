import validator from 'validator'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from '../models/doctorModel.js'
import { unlink } from 'fs/promises'
import { isValidFee, isValidAddress } from '../utils/validation.js'
import { sendMail } from '../config/mailer.js'
import { logAuthEvent, logError } from '../config/logger.js'

export const addDoctor = async (req, res) => {
	try {
		const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
		if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address || !req.file) {
			return res.status(400).json({ success: false, message: 'All fields are required, including the image.' })
		}
		if (!isValidFee(fees)) return res.status(400).json({ success: false, message: 'Fees must be a positive amount.' })
		if (!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email format.' })
		if (password.length < 8) return res.status(400).json({ success: false, message: 'Please enter strong password.' })
		if (await doctorModel.findOne({ email })) return res.status(409).json({ success: false, message: 'A doctor with this email already exists.' })

		let parsedAddress
		try { parsedAddress = JSON.parse(address) } catch { return res.status(400).json({ success: false, message: 'Invalid address format.' }) }
		
		// Validate address structure and content
		if (!isValidAddress(parsedAddress)) {
			return res.status(400).json({ success: false, message: 'Invalid address. Please provide valid line1, city, state, and pincode (5-6 digits).' })
		}
		
		const hashPassword = await bcrypt.hash(password, await bcrypt.genSalt(10))
		const imageUpload = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' })
		
		// Generate verification token (valid for 24 hours)
		const verificationToken = crypto.randomBytes(32).toString('hex')
		const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
		
		const doctor = await new doctorModel({ 
			name, 
			email, 
			image: imageUpload.secure_url, 
			password: hashPassword, 
			speciality, 
			degree, 
			experience, 
			about, 
			fees: Number(fees), 
			address: parsedAddress, 
			date: Date.now(),
			emailVerified: false,
			verificationToken,
			verificationTokenExpiry: tokenExpiry
		}).save()

		// Send verification email
		await sendMail({
			to: email,
			subject: 'DocNest Account Verification - Please Share Token with Admin',
			html: `
				<h2>Email Verification</h2>
				<p>Hi Dr. ${name},</p>
				<p>Your DocNest doctor account has been created by an administrator. Please verify your email address to activate your account.</p>
				<p><strong>Your Verification Token:</strong></p>
				<p style="font-size: 18px; font-family: monospace; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
					${verificationToken}
				</p>
				<p><strong>Instructions:</strong></p>
				<ol>
					<li>Copy the verification token above</li>
					<li>Share this token with the administrator who added you</li>
					<li>The administrator will verify your email in the doctor form</li>
					<li>You'll then be able to login to your account</li>
				</ol>
				<p>This token will expire in 24 hours.</p>
				<p>Best regards,<br/>DocNest Team</p>
			`
		})

		logAuthEvent('doctor_added', doctor._id, 'admin', { email })
		return res.status(201).json({ 
			success: true, 
			message: 'Doctor added successfully. Verification email sent. Waiting for token verification.',
			doctorId: doctor._id,
			doctorEmail: email
		})
	} catch (error) {
		console.error('[addDoctor]', error.message)
		logError(error, { action: 'addDoctor' })
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	} finally {
		if (req.file?.path) await unlink(req.file.path).catch(() => {})
	}
}

export const verifyDoctorToken = async (req, res) => {
	try {
		const { doctorId, verificationToken } = req.body

		if (!doctorId || !verificationToken) {
			return res.status(400).json({ 
				success: false, 
				message: 'Doctor ID and verification token are required.' 
			})
		}

		const doctor = await doctorModel.findById(doctorId)
		if (!doctor) {
			logAuthEvent('verify_token_failed_not_found', null, 'admin', { doctorId })
			return res.status(404).json({ 
				success: false, 
				message: 'Doctor not found.' 
			})
		}

		// Check if already verified
		if (doctor.emailVerified) {
			return res.status(400).json({ 
				success: false, 
				message: 'Doctor email is already verified.' 
			})
		}

		// Check if token is valid and not expired
		if (!doctor.verificationToken || doctor.verificationToken !== verificationToken) {
			logAuthEvent('verify_token_failed_invalid', doctor._id, 'admin', { doctorId })
			return res.status(401).json({ 
				success: false, 
				message: 'Invalid verification token.' 
			})
		}

		if (doctor.verificationTokenExpiry < new Date()) {
			logAuthEvent('verify_token_failed_expired', doctor._id, 'admin', { doctorId })
			return res.status(401).json({ 
				success: false, 
				message: 'Verification token has expired. Please resend verification email.' 
			})
		}

		// Mark email as verified
		doctor.emailVerified = true
		doctor.verificationToken = null
		doctor.verificationTokenExpiry = null
		await doctor.save()

		logAuthEvent('doctor_email_verified', doctor._id, 'admin', { doctorId })
		return res.json({ 
			success: true, 
			message: 'Doctor email verified successfully. Doctor can now login.' 
		})
	} catch (error) {
		console.error('[verifyDoctorToken]', error.message)
		logError(error, { action: 'verifyDoctorToken' })
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}

export const allDoctors = async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page) || 1)
		const limit = Math.min(500, parseInt(req.query.limit) || 100)
		const speciality = (req.query?.speciality ?? req.body?.speciality ?? '').toString().trim()
		const skip = (page - 1) * limit

		const filter = {}
		if (speciality) filter.speciality = new RegExp(speciality, 'i')

		const doctors = await doctorModel
			.find(filter)
			.select('-password')
			.sort({ name: 1 })
			.skip(skip)
			.limit(limit)
			.lean()

		const total = await doctorModel.countDocuments(filter)

		return res.json({
			success: true,
			doctors,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit)
			}
		})
	} catch (error) {
		console.error('[allDoctors]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}
export {
    changeAvailability,
    changeAvailablity,
    doctorList,
    doctorProfile,
    updateDoctorProfile,
    incrementView,
    toggleLike
} from './doctorProfileController.js'
