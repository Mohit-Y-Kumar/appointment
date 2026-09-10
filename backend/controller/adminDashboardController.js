import doctorModel from '../models/doctorModel.js'
import userModel from '../models/userModel.js'
import appointmentModel from '../models/appointmentModel.js'

export const adminDashboard = async (req, res) => {
	try {
		const [doctors, users, appointments] = await Promise.all([
			doctorModel.find({}).select('_id'),
			userModel.find({}).select('_id'),
			appointmentModel.find({})
		])

		const revenue = appointments
			.filter(appointment => appointment.payment && !appointment.cancelled)
			.reduce((sum, appointment) => sum + (appointment.amount || 0), 0)

		const now = new Date()
		const todayDay = now.getDate()
		const todayMonth = now.getMonth() + 1
		const todayYear = now.getFullYear()
		const cancelledToday = appointments.filter(appointment => {
			if (!appointment.cancelled || !appointment.slotDate) return false
			const parts = appointment.slotDate.split('_')
			return parts.length === 3 && Number(parts[0]) === todayDay && Number(parts[1]) === todayMonth && Number(parts[2]) === todayYear
		}).length

		return res.json({ success: true, dashData: {
			doctors: doctors.length,
			appointments: appointments.length,
			patients: users.length,
			revenue,
			cancelledToday,
			latestAppointments: [...appointments].reverse().slice(0, 5)
		} })
	} catch (error) {
		console.error('[adminDashboard]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}
