import express from 'express'
import { adminDashboard } from '../controller/adminDashboardController.js'
import { appointmentsAdmin, appointmentCancel } from '../controller/adminAppointmentController.js'
import { addDoctor, allDoctors, changeAvailability, verifyDoctorToken } from '../controller/adminDoctorController.js'
import { loginAdmin } from '../controller/adminAuthController.js'
import { processRefund, getPendingRefunds } from '../controller/refundController.js'
import upload from '../middleware/multer.js'
import authAdmin from '../middleware/authAdmin.js'
import { authLimiter, refreshLimiter } from '../middleware/rateLimiters.js'
import { refreshForRole, logoutForRole } from '../controller/authController.js'

const adminRouter = express.Router()

adminRouter.post('/add-doctor',          authAdmin, upload.single('image'), addDoctor)
adminRouter.post('/verify-doctor-token', authAdmin, verifyDoctorToken)
adminRouter.post('/login',               authLimiter, loginAdmin)
adminRouter.post('/refresh',             refreshLimiter, refreshForRole('admin'))
adminRouter.post('/logout',              logoutForRole('admin'))
adminRouter.post('/all-doctors',         authAdmin, allDoctors)
adminRouter.post('/change-availability', authAdmin, changeAvailability)
adminRouter.get('/appointments',         authAdmin, appointmentsAdmin)
adminRouter.post('/cancel-appointment',  authAdmin, appointmentCancel)
adminRouter.get('/dashboard',            authAdmin, adminDashboard)
adminRouter.get('/pending-refunds',      authAdmin, getPendingRefunds)
adminRouter.post('/process-refund/:refundId', authAdmin, processRefund)

export default adminRouter
