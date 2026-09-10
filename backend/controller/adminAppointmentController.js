import appointmentModel from '../models/appointmentModel.js'
import doctorModel from '../models/doctorModel.js'
import messageModel from '../models/messageModel.js'
import callModel from '../models/callModel.js'
import mongoose from 'mongoose'

export const appointmentsAdmin = async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page) || 1)
		const limit = Math.min(100, parseInt(req.query.limit) || 10)
		const status = req.query.status || ''
		const skip = (page - 1) * limit

		const filter = {}
		if (status === 'cancelled') filter.cancelled = true
		else if (status === 'completed') filter.isCompleted = true
		else if (status === 'pending') filter.cancelled = false

		const appointments = await appointmentModel
			.find(filter)
			.sort({ date: -1 })
			.skip(skip)
			.limit(limit)
			.lean()

		const total = await appointmentModel.countDocuments(filter)

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
		console.error('[appointmentsAdmin]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}

export const appointmentCancel = async (req, res) => {
	try {
		const { appointmentId } = req.body
		if (!mongoose.isValidObjectId(appointmentId)) return res.status(400).json({ success: false, message: 'Invalid appointment ID.' })
		const appointmentData = await appointmentModel.findById(appointmentId)
		if (!appointmentData) return res.status(404).json({ success: false, message: 'Appointment not found.' })
		if (appointmentData.cancelled) return res.status(409).json({ success: false, message: 'Appointment is already cancelled.' })
		if (appointmentData.payment) return res.status(409).json({ success: false, message: 'Paid appointments require a refund before cancellation.' })

		const session = await mongoose.startSession()
		try {
			await session.withTransaction(async () => {
				const cancelled = await appointmentModel.findOneAndUpdate({ _id: appointmentId, cancelled: false, payment: false }, { cancelled: true }, { new: true, session })
				if (!cancelled) { const error = new Error('Appointment could not be cancelled.'); error.status = 409; throw error }
				const released = await doctorModel.updateOne({ _id: cancelled.docId }, { $pull: { [`slots_booked.${cancelled.slotDate}`]: cancelled.slotTime } }, { session })
				if (!released.matchedCount) { const error = new Error('Doctor record could not be updated.'); error.status = 409; throw error }
				
				// Clean up chat messages and call records for this appointment
				await messageModel.deleteMany({ appointmentId: appointmentId }, { session })
				await callModel.deleteMany({ appointmentId: appointmentId }, { session })
			})
		} catch (error) {
			if (error.status) return res.status(error.status).json({ success: false, message: error.message })
			throw error
		} finally {
			await session.endSession()
		}
		return res.json({ success: true, message: 'Appointment cancelled successfully.' })
	} catch (error) {
		console.error('[appointmentCancel]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}
