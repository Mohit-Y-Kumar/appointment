import express from 'express'
import {
    doctorList, doctorProfile, incrementView, toggleLike, updateDoctorProfile
} from '../controller/doctorProfileController.js'
import { loginDoctor } from '../controller/doctorAuthController.js'
import { appointmentCancel, appointmentComplete, appointmentsDoctor } from '../controller/doctorAppointmentController.js'
import { doctorDashboard, getDoctorRatings, getVisitStats, getRevenueData, getUpcomingToday } from '../controller/doctorAnalyticsController.js'
import authDoctor from '../middleware/authDoctor.js'
import authUser from '../middleware/authUser.js'
import { authLimiter, refreshLimiter } from '../middleware/rateLimiters.js'
import { refreshForRole, logoutForRole } from '../controller/authController.js'

const doctorRouter = express.Router()

doctorRouter.get('/list',                doctorList)
doctorRouter.post('/login',              authLimiter, loginDoctor)
doctorRouter.post('/refresh',            refreshLimiter, refreshForRole('doctor'))
doctorRouter.post('/logout',             logoutForRole('doctor'))
doctorRouter.get('/appointments',        authDoctor, appointmentsDoctor)
doctorRouter.post('/complete-appointment', authDoctor, appointmentComplete)
doctorRouter.post('/cancel-appointment', authDoctor, appointmentCancel)
doctorRouter.get('/dashboard',           authDoctor, doctorDashboard)
doctorRouter.get('/profile',             authDoctor, doctorProfile)
doctorRouter.post('/update-profile',     authDoctor, updateDoctorProfile)
doctorRouter.post('/view/:docId',        incrementView)
doctorRouter.post('/like/:docId',        authUser, toggleLike)
doctorRouter.get('/ratings',             authDoctor, getDoctorRatings)
doctorRouter.get('/visit-stats',         authDoctor, getVisitStats)
doctorRouter.get('/revenue',             authDoctor, getRevenueData)
doctorRouter.get('/upcoming-today',      authDoctor, getUpcomingToday)

export default doctorRouter
