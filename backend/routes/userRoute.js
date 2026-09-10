import express from 'express'
import {
    getProfile, updateProfile
} from '../controller/userProfileController.js'
import { bookAppointment, cancelAppointment, listAppointment } from '../controller/userAppointmentController.js'
import { paymentRazorpay, verifyRazorpay, handleRazorpayWebhook } from '../controller/userPaymentController.js'
import { requestRefund, getRefundStatus, getUserRefunds } from '../controller/refundController.js'
import { loginUser, registerUser, verifyUserEmail, resendVerificationEmail, forgotPassword, resetPassword } from '../controller/userAuthController.js'
import authUser from '../middleware/authUser.js'
import upload from '../middleware/multer.js'
import { authLimiter, refreshLimiter, webhookLimiter } from '../middleware/rateLimiters.js'
import { refreshForRole, logoutForRole } from '../controller/authController.js'

const userRouter = express.Router()

userRouter.post('/register',           authLimiter, registerUser)
userRouter.post('/login',              authLimiter, loginUser)
userRouter.post('/verify-email',       authLimiter, verifyUserEmail)
userRouter.post('/resend-verification', authLimiter, resendVerificationEmail)
userRouter.post('/forgot-password',    authLimiter, forgotPassword)
userRouter.post('/reset-password',     authLimiter, resetPassword)
userRouter.post('/refresh',            refreshLimiter, refreshForRole('user'))
userRouter.post('/logout',             logoutForRole('user'))
userRouter.get('/get-profile',         authUser, getProfile)
userRouter.post('/update-profile',     authUser, upload.single('image'), updateProfile)
userRouter.post('/book-appointment',   authUser, bookAppointment)
userRouter.get('/appointments',        authUser, listAppointment)
userRouter.post('/cancel-appointment', authUser, cancelAppointment)
userRouter.post('/payment-razorpay',   authUser, paymentRazorpay)
userRouter.post('/verifyRazorpay',     authUser, verifyRazorpay)
userRouter.post('/payment/webhook',    webhookLimiter, handleRazorpayWebhook)
userRouter.post('/request-refund/:appointmentId',  authUser, requestRefund)
userRouter.get('/refund-status/:refundId',         authUser, getRefundStatus)
userRouter.get('/my-refunds',                      authUser, getUserRefunds)

export default userRouter
