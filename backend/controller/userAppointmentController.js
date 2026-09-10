import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/appointmentModel.js'
import messageModel from '../models/messageModel.js'
import callModel from '../models/callModel.js'
import mongoose from 'mongoose'
import { sendMail } from '../config/mailer.js'
import { appointmentBookedTemplate, appointmentCancelledTemplate } from '../config/emailTemplates.js'
import { isValidAppointmentDate, isValidSlotTime } from '../utils/validation.js'

export const bookAppointment = async (req, res) => {
	try {
		const { docId, slotDate, slotTime } = req.body
		if (!docId || !slotDate || !slotTime) return res.status(400).json({ success: false, message: 'Doctor, date and time slot are required.' })
		if (!mongoose.isValidObjectId(docId) || !isValidAppointmentDate(slotDate) || !isValidSlotTime(slotTime)) return res.status(400).json({ success: false, message: 'Invalid date or time slot.' })

		const session = await mongoose.startSession()
		let newAppointment
		let docData
		try {
			await session.withTransaction(async () => {
				docData = await doctorModel.findById(docId).select('-password').session(session)
				if (!docData) { const error = new Error('Doctor not found.'); error.status = 404; throw error }
				if (!docData.available) { const error = new Error('Doctor is not available.'); error.status = 409; throw error }
				const userData = await userModel.findById(req.userId).select('-password').session(session)
				if (!userData) { const error = new Error('User not found.'); error.status = 404; throw error }
				const docDataPlain = docData.toObject()
				delete docDataPlain.slots_booked
				const slotPath = `slots_booked.${slotDate}`
				const reservedDoctor = await doctorModel.findOneAndUpdate(
					{ _id: docId, available: true, [slotPath]: { $ne: slotTime } },
					{ $addToSet: { [slotPath]: slotTime } },
					{ new: true, session }
				)
				if (!reservedDoctor) { const error = new Error('This slot is already booked or unavailable.'); error.status = 409; throw error }
				newAppointment = await new appointmentModel({
					userId: req.userId,
					docId,
					userData: userData.toObject(),
					docData: docDataPlain,
					amount: docData.fees,
					slotTime,
					slotDate,
					date: Date.now()
				}).save({ session })
			})
		} catch (error) {
			if (error.status) return res.status(error.status).json({ success: false, message: error.message })
			throw error
		} finally {
			await session.endSession()
		}

		const user = await userModel.findById(req.userId).select('name email')
		const { subject, html } = appointmentBookedTemplate({ userName: user.name, doctorName: docData.name, slotDate: slotDate.replace(/_/g, '/'), slotTime, fees: docData.fees })
		sendMail({ to: user.email, subject, html })
		return res.status(201).json({ success: true, message: 'Appointment booked.', appointmentId: newAppointment._id })
	} catch (error) {
		console.error('[bookAppointment]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}

export const listAppointment = async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page) || 1)
		const limit = Math.min(100, parseInt(req.query.limit) || 10)
		const skip = (page - 1) * limit

		const appointments = await appointmentModel
			.find({ userId: req.userId })
			.sort({ date: -1 })
			.skip(skip)
			.limit(limit)
			.lean()

		const total = await appointmentModel.countDocuments({ userId: req.userId })

		return res.json({
			success: true,
			appointments,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit)
			}
		})
	} catch (error) {
		console.error('[listAppointment]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}

export const cancelAppointment = async (req, res) => {
	try {
		const { appointmentId } = req.body
		if (!mongoose.isValidObjectId(appointmentId)) return res.status(400).json({ success: false, message: 'Invalid appointment ID.' })
		const appointmentData = await appointmentModel.findById(appointmentId)
		if (!appointmentData) return res.status(404).json({ success: false, message: 'Appointment not found.' })
		if (String(appointmentData.userId) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Unauthorized request.' })
		if (appointmentData.cancelled) return res.status(409).json({ success: false, message: 'Appointment is already cancelled.' })
		if (appointmentData.payment) return res.status(409).json({ success: false, message: 'Paid appointments require a refund before cancellation.' })

		const session = await mongoose.startSession()
		let cancelledAppointment
		try {
			await session.withTransaction(async () => {
				cancelledAppointment = await appointmentModel.findOneAndUpdate({ _id: appointmentId, userId: req.userId, cancelled: false, payment: false }, { cancelled: true }, { new: true, session })
				if (!cancelledAppointment) { const error = new Error('Appointment could not be cancelled.'); error.status = 409; throw error }
				const released = await doctorModel.updateOne({ _id: cancelledAppointment.docId }, { $pull: { [`slots_booked.${cancelledAppointment.slotDate}`]: cancelledAppointment.slotTime } }, { session })
				if (!released.matchedCount) { const error = new Error('Doctor record could not be updated.'); error.status = 409; throw error }
				
				// Clean up chat messages and call records for this appointment
				// This preserves privacy by removing communication history when appointment is cancelled
				await messageModel.deleteMany({ appointmentId: appointmentId }, { session })
				await callModel.deleteMany({ appointmentId: appointmentId }, { session })
			})
		} catch (error) {
			if (error.status) return res.status(error.status).json({ success: false, message: error.message })
			throw error
		} finally {
			await session.endSession()
		}

		const user = await userModel.findById(req.userId).select('name email')
		const { subject, html } = appointmentCancelledTemplate({ userName: user.name, doctorName: cancelledAppointment.docData.name, slotDate: cancelledAppointment.slotDate.replace(/_/g, '/'), slotTime: cancelledAppointment.slotTime })
		sendMail({ to: user.email, subject, html })
		return res.json({ success: true, message: 'Appointment cancelled successfully.' })
	} catch (error) {
		console.error('[cancelAppointment]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}
