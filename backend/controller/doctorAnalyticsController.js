import appointmentModel from '../models/appointmentModel.js'
import doctorModel from '../models/doctorModel.js'
import reviewModel from '../models/reviewModel.js'

export const doctorDashboard = async (req, res) => {
    try {
        const appointments = await appointmentModel.find({ docId: req.docId })
        const earnings = appointments.reduce((sum, item) => (!item.cancelled && (item.isCompleted || item.payment)) ? sum + (item.amount || 0) : sum, 0)
        const patientSet = new Set(appointments.map(item => String(item.userId)))
        const doctor = await doctorModel.findById(req.docId).select('averageRating totalReviews')
        return res.json({ success: true, dashData: {
            earnings,
            appointments: appointments.length,
            patients: patientSet.size,
            averageRating: doctor?.averageRating ?? 0,
            totalReviews: doctor?.totalReviews ?? 0,
            latestAppointments: [...appointments].reverse().slice(0, 5)
        } })
    } catch (error) {
        console.error('[doctorDashboard]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const getDoctorRatings = async (req, res) => {
    try {
        const reviews = await reviewModel.find({ doctor: req.docId, isRated: true })
        if (!reviews.length) return res.json({ success: true, ratings: null })
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviews.forEach(review => { breakdown[Math.round(review.rating)]++; })
        const average = parseFloat((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1))
        const byStars = [5, 4, 3, 2, 1].map(stars => ({ stars, count: breakdown[stars], pct: Math.round((breakdown[stars] / reviews.length) * 100) }))
        return res.json({ success: true, ratings: { average, totalReviews: reviews.length, byStars } })
    } catch (error) {
        console.error('[getDoctorRatings]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

const getPeriodStart = (period, now = new Date()) => {
    const start = new Date(now)
    if (period === 'daily') start.setDate(now.getDate() - 6)
    if (period === 'monthly') start.setMonth(now.getMonth() - 11)
    if (period === 'yearly') start.setFullYear(now.getFullYear() - 6)
    return start
}

const getPeriodLabel = (date, period) => {
    if (period === 'daily') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
    if (period === 'monthly') return date.toLocaleString('default', { month: 'short' })
    return String(date.getFullYear())
}

export const getVisitStats = async (req, res) => {
    try {
        const period = ['daily', 'monthly', 'yearly'].includes(req.query.period) ? req.query.period : 'daily'
        const appointments = await appointmentModel.find({ docId: req.docId, cancelled: false, date: { $gte: getPeriodStart(period).getTime() } }).sort({ date: 1 })
        const seenPatients = new Set()
        const stats = {}
        appointments.forEach(appointment => {
            const name = getPeriodLabel(new Date(appointment.date), period)
            if (!stats[name]) stats[name] = { name, new: 0, ret: 0 }
            const patientId = String(appointment.userId)
            if (seenPatients.has(patientId)) stats[name].ret++
            else { stats[name].new++; seenPatients.add(patientId) }
        })
        return res.json({ success: true, visitStats: Object.values(stats) })
    } catch (error) {
        console.error('[getVisitStats]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const getRevenueData = async (req, res) => {
    try {
        const period = ['daily', 'monthly', 'yearly'].includes(req.query.period) ? req.query.period : 'monthly'
        const appointments = await appointmentModel.find({
            docId: req.docId,
            $or: [{ isCompleted: true }, { payment: true }],
            cancelled: false,
            date: { $gte: getPeriodStart(period).getTime() }
        })
        const revenue = {}
        appointments.forEach(appointment => {
            const name = getPeriodLabel(new Date(appointment.date), period)
            revenue[name] = (revenue[name] ?? 0) + (appointment.amount ?? 0)
        })
        return res.json({ success: true, revenueData: Object.entries(revenue).map(([name, value]) => ({ name, revenue: value })) })
    } catch (error) {
        console.error('[getRevenueData]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const getUpcomingToday = async (req, res) => {
    try {
        const now = new Date()
        const today = `${now.getDate()}_${now.getMonth() + 1}_${now.getFullYear()}`
        const upcoming = await appointmentModel.find({ docId: req.docId, slotDate: today, cancelled: false, isCompleted: false }).sort({ slotTime: 1 })
        return res.json({ success: true, upcoming })
    } catch (error) {
        console.error('[getUpcomingToday]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}