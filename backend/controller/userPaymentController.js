import Razorpay from 'razorpay'
import crypto from 'crypto'
import mongoose from 'mongoose'
import appointmentModel from '../models/appointmentModel.js'
import paymentModel from '../models/paymentModel.js'
import userModel from '../models/userModel.js'
import webhookEventModel from '../models/webhookEventModel.js'
import { sendMail } from '../config/mailer.js'
import { logError } from '../config/logger.js'
import { paymentSuccessTemplate } from '../config/emailTemplates.js'

const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials not configured.')
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    })
}

export const paymentRazorpay = async (req, res) => {
    try {
        const { appointmentId } = req.body
        if (!mongoose.isValidObjectId(appointmentId)) return res.status(400).json({ success: false, message: 'Invalid appointment ID.' })
        const appointmentData = await appointmentModel.findById(appointmentId)
        if (!appointmentData || appointmentData.cancelled) return res.status(400).json({ success: false, message: 'Appointment not found or cancelled.' })
        if (String(appointmentData.userId) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Unauthorized request.' })

        const razorpayInstance = getRazorpayInstance()
        let payment = await paymentModel.findOne({ appointmentId })
        let order
        if (payment?.status === 'paid' || payment?.status === 'created') {
            order = await razorpayInstance.orders.fetch(payment.razorpay_order_id)
        } else if (payment?.status === 'creating' && payment.creationLockExpiresAt > new Date()) {
            return res.status(409).json({ success: false, message: 'Payment order creation is already in progress.' })
        } else {
            const creationLock = crypto.randomUUID()
            const lockExpiry = new Date(Date.now() + 2 * 60 * 1000)
            try {
                payment = await paymentModel.findOneAndUpdate(
                    {
                        appointmentId,
                        $or: [
                            { status: { $exists: false } },
                            { status: 'failed' },
                            { status: 'creating', creationLockExpiresAt: { $lt: new Date() } }
                        ]
                    },
                    {
                        $set: { status: 'creating', creationLock, creationLockExpiresAt: lockExpiry },
                        $setOnInsert: {
                            appointmentId,
                            userId: appointmentData.userId,
                            razorpay_order_id: `pending-${creationLock}`,
                            amount: appointmentData.amount
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                )
            } catch (error) {
                if (error?.code === 11000) return res.status(409).json({ success: false, message: 'Payment order creation is already in progress.' })
                throw error
            }

            if (payment.creationLock !== creationLock) return res.status(409).json({ success: false, message: 'Payment order creation is already in progress.' })
            try {
                order = await razorpayInstance.orders.create({
                    amount: Number(appointmentData.amount) * 100,
                    currency: process.env.CURRENCY || 'INR',
                    receipt: appointmentId.toString()
                })
                const claimed = await paymentModel.findOneAndUpdate(
                    { _id: payment._id, status: 'creating', creationLock },
                    { status: 'created', razorpay_order_id: order.id, creationLock: null, creationLockExpiresAt: null },
                    { new: true }
                )
                if (!claimed) return res.status(409).json({ success: false, message: 'Payment order creation changed. Please retry.' })
            } catch (error) {
                await paymentModel.deleteOne({ _id: payment._id, status: 'creating', creationLock })
                throw error
            }
        }
        return res.json({ success: true, order })
    } catch (error) {
        console.error('[paymentRazorpay]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const verifyRazorpay = async (req, res) => {
    try {
        const response = req.body?.response
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response || {}
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ success: false, message: 'Incomplete payment response.' })
        const payment = await paymentModel.findOne({ razorpay_order_id })
        if (!payment || String(payment.userId) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Unauthorized payment request.' })

        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
        if (expectedSignature !== razorpay_signature) return res.status(400).json({ success: false, message: 'Payment verification failed.' })
        if (payment.status === 'paid') {
            if (payment.razorpay_payment_id === razorpay_payment_id) return res.json({ success: true, message: 'Payment already verified.' })
            return res.status(409).json({ success: false, message: 'Payment order was already used.' })
        }

        const razorpayInstance = getRazorpayInstance()
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        if (String(orderInfo.receipt) !== String(payment.appointmentId)) return res.status(400).json({ success: false, message: 'Payment order mismatch.' })
        if (Number(orderInfo.amount) !== Number(payment.amount) * 100) return res.status(400).json({ success: false, message: 'Payment amount mismatch.' })
        const paymentInfo = await razorpayInstance.payments.fetch(razorpay_payment_id)
        if (paymentInfo.order_id !== razorpay_order_id || paymentInfo.status !== 'captured') return res.status(400).json({ success: false, message: 'Payment is not captured.' })
        if (Number(paymentInfo.amount) !== Number(payment.amount) * 100) return res.status(400).json({ success: false, message: 'Captured amount mismatch.' })

        const session = await mongoose.startSession()
        let appointment
        let alreadyVerified = false
        try {
            await session.withTransaction(async () => {
                const claimedPayment = await paymentModel.findOneAndUpdate({ _id: payment._id, status: 'created' }, { razorpay_payment_id, razorpay_signature, status: 'paid' }, { new: true, session })
                if (!claimedPayment) {
                    const existingPayment = await paymentModel.findById(payment._id).session(session)
                    if (existingPayment?.status === 'paid' && existingPayment.razorpay_payment_id === razorpay_payment_id) { alreadyVerified = true; return }
                    const error = new Error('Payment order was already used.'); error.status = 409; throw error
                }
                appointment = await appointmentModel.findOneAndUpdate({ _id: orderInfo.receipt, userId: req.userId, cancelled: false, payment: false }, { payment: true }, { new: true, session })
                if (!appointment) {
                    const alreadyPaid = await appointmentModel.exists({ _id: orderInfo.receipt, userId: req.userId, payment: true }).session(session)
                    if (alreadyPaid) { alreadyVerified = true; return }
                    const error = new Error('Appointment is no longer available for payment.'); error.status = 409; throw error
                }
            })
        } catch (error) {
            if (error.status) return res.status(error.status).json({ success: false, message: error.message })
            throw error
        } finally {
            await session.endSession()
        }
        if (alreadyVerified) return res.json({ success: true, message: 'Payment already verified.' })

        const user = await userModel.findById(appointment.userId).select('name email')
        const { subject, html } = paymentSuccessTemplate({ userName: user.name, doctorName: appointment.docData.name, slotDate: appointment.slotDate.replace(/_/g, '/'), slotTime: appointment.slotTime, amount: appointment.amount, paymentId: razorpay_payment_id })
        sendMail({ to: user.email, subject, html }).catch(err => {
            logError(err, { action: 'sendPaymentSuccessEmail_verify', appointmentId: appointment._id })
        })

        return res.json({ success: true, message: 'Payment successful.' })
    } catch (error) {
        console.error('[verifyRazorpay]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const handleRazorpayWebhook = async (req, res) => {
    const webhookId = req.headers['x-razorpay-event-id']

    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
        const signature = req.headers['x-razorpay-signature']
        if (!webhookSecret || typeof signature !== 'string' || !req.rawBody) return res.status(400).json({ success: false, message: 'Invalid webhook request.' })

        // Verify webhook signature
        const expected = crypto.createHmac('sha256', webhookSecret).update(req.rawBody).digest('hex')
        const expectedBuffer = Buffer.from(expected, 'utf8')
        const signatureBuffer = Buffer.from(signature, 'utf8')
        if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return res.status(401).json({ success: false, message: 'Invalid webhook signature.' })

        const event = JSON.parse(req.rawBody.toString('utf8'))
        if (!['payment.captured', 'order.paid'].includes(event.event)) return res.json({ success: true })

        // Check for idempotency using webhook ID (Razorpay event_id)
        if (webhookId) {
            const existingEvent = await webhookEventModel.findOne({ webhookId })
            if (existingEvent) {
                // Webhook already processed, return success to prevent retries
                return res.json({ success: true, message: 'Webhook already processed.' })
            }
        }

        const paymentEntity = event.payload?.payment?.entity
        const orderEntity = event.payload?.order?.entity
        const orderId = paymentEntity?.order_id || orderEntity?.id
        const paymentId = paymentEntity?.id
        if (!orderId) return res.status(400).json({ success: false, message: 'Webhook order is missing.' })
        if (!paymentEntity || !paymentId) return res.status(400).json({ success: false, message: 'Webhook payment is missing.' })

        const payment = await paymentModel.findOne({ razorpay_order_id: orderId })
        if (!payment || payment.status === 'paid') {
            // Log the webhook event even if already processed to prevent replay attacks
            if (webhookId) {
                await webhookEventModel.create({
                    webhookId,
                    eventType: event.event,
                    orderId,
                    paymentId,
                    status: 'completed',
                    processedAt: new Date(),
                    rawPayload: event
                }).catch(() => { }) // Ignore duplicate key errors
            }
            return res.json({ success: true })
        }

        if (paymentEntity.status !== 'captured' || Number(paymentEntity.amount) !== Number(payment.amount) * 100) return res.status(400).json({ success: false, message: 'Webhook payment mismatch.' })

        const session = await mongoose.startSession()
        let emailAppointment = null;
        try {
            await session.withTransaction(async () => {
                const claimedPayment = await paymentModel.findOneAndUpdate({ _id: payment._id, status: 'created' }, { status: 'paid', razorpay_payment_id: paymentId, razorpay_signature: signature }, { new: true, session })
                if (!claimedPayment) return
                const appointment = await appointmentModel.findOneAndUpdate({ _id: payment.appointmentId, userId: payment.userId, cancelled: false, payment: false }, { payment: true }, { new: true, session })
                if (!appointment && !await appointmentModel.exists({ _id: payment.appointmentId, payment: true }).session(session)) { const error = new Error('Appointment is no longer available for payment.'); error.status = 409; throw error }

                // FIX: only set this when we (not a prior, already-completed request)
                // are the one making the payment→paid transition.
                if (appointment) emailAppointment = appointment

                // Log successful webhook processing
                if (webhookId) {
                    await webhookEventModel.create({
                        webhookId,
                        eventType: event.event,
                        orderId,
                        paymentId,
                        status: 'completed',
                        processedAt: new Date(),
                        rawPayload: event
                    }, { session }).catch(() => { }) // Ignore errors from webhook tracking
                }
            })
        } catch (error) {
            // Log failed webhook processing
            if (webhookId) {
                await webhookEventModel.findOneAndUpdate(
                    { webhookId },
                    {
                        status: 'failed',
                        error: error.message
                    },
                    { upsert: true }
                ).catch(() => { })
            }
            if (error.status) return res.status(error.status).json({ success: false, message: error.message })
            throw error
        } finally {
            await session.endSession()
        }
        if (emailAppointment) {
            const user = await userModel.findById(emailAppointment.userId).select('name email')
            if (user) {
                const { subject, html } = paymentSuccessTemplate({
                    userName: user.name,
                    doctorName: emailAppointment.docData.name,
                    slotDate: emailAppointment.slotDate.replace(/_/g, '/'),
                    slotTime: emailAppointment.slotTime,
                    amount: emailAppointment.amount,
                    paymentId
                })
                sendMail({ to: user.email, subject, html }).catch(err => {
                    logError(err, { action: 'sendPaymentSuccessEmail_webhook', appointmentId: emailAppointment._id })
                })
            }
        }

        return res.json({ success: true })
    } catch (error) {
        console.error('[paymentWebhook]', error.message)

        // Log error in webhook event tracking
        if (webhookId) {
            await webhookEventModel.findOneAndUpdate(
                { webhookId },
                {
                    status: 'failed',
                    error: error.message
                },
                { upsert: true }
            ).catch(() => { })
        }

        return res.status(400).json({ success: false, message: 'Invalid webhook payload.' })
    }
}
