import appointmentModel from '../models/appointmentModel.js'
import doctorModel from '../models/doctorModel.js'
import mongoose from 'mongoose'

export const appointmentsDoctor = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, parseInt(req.query.limit) || 10)
        const skip = (page - 1) * limit

        const appointments = await appointmentModel
            .find({ docId: req.docId })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await appointmentModel.countDocuments({ docId: req.docId })

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
        console.error('[appointmentsDoctor]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const appointmentComplete = async (req, res) => {
    try {
        const { appointmentId } = req.body
        if (!mongoose.isValidObjectId(appointmentId)) return res.status(400).json({ success: false, message: 'Invalid appointment ID.' })
        const appointment = await appointmentModel.findOneAndUpdate(
            { _id: appointmentId, docId: req.docId, cancelled: false, payment: true },
            { isCompleted: true },
            { new: true }
        )
        if (!appointment) return res.status(403).json({ success: false, message: 'Unauthorized or appointment not found.' })
        return res.json({ success: true, message: 'Appointment marked as completed.' })
    } catch (error) {
        console.error('[appointmentComplete]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body
        if (!mongoose.isValidObjectId(appointmentId)) return res.status(400).json({ success: false, message: 'Invalid appointment ID.' })
        const session = await mongoose.startSession()
        try {
            await session.withTransaction(async () => {
                const appointment = await appointmentModel.findOneAndUpdate(
                    { _id: appointmentId, docId: req.docId, cancelled: false, payment: false },
                    { cancelled: true },
                    { new: true, session }
                )
                if (!appointment) {
                    const paid = await appointmentModel.exists({ _id: appointmentId, docId: req.docId, payment: true, cancelled: false }).session(session)
                    const error = new Error(paid ? 'Paid appointments require a refund before cancellation.' : 'Unauthorized or appointment not found.')
                    error.status = paid ? 409 : 403
                    throw error
                }
                const released = await doctorModel.updateOne(
                    { _id: appointment.docId },
                    { $pull: { [`slots_booked.${appointment.slotDate}`]: appointment.slotTime } },
                    { session }
                )
                if (!released.matchedCount) {
                    const error = new Error('Doctor record could not be updated.')
                    error.status = 409
                    throw error
                }
            })
        } catch (error) {
            if (error.status) return res.status(error.status).json({ success: false, message: error.message })
            throw error
        } finally {
            await session.endSession()
        }
        return res.json({ success: true, message: 'Appointment cancelled.' })
    } catch (error) {
        console.error('[appointmentCancel]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}
