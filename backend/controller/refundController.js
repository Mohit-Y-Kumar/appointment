import Razorpay from 'razorpay'
import mongoose from 'mongoose'
import refundModel from '../models/refundModel.js'
import appointmentModel from '../models/appointmentModel.js'
import paymentModel from '../models/paymentModel.js'
import userModel from '../models/userModel.js'
import { sendMail } from '../config/mailer.js'
import { parseAppointmentDateTime } from '../utils/validation.js'

const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials not configured.')
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    })
}

/**
 * User requests a refund for a paid appointment
 */
export const requestRefund = async (req, res) => {
    try {
        const { appointmentId } = req.params
        const { reason, description } = req.body
        const userId = req.userId

        if (!mongoose.isValidObjectId(appointmentId)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID.' })
        }

        // Validate reason
        if (reason && !['appointment_cancelled', 'user_request', 'other'].includes(reason)) {
            return res.status(400).json({ success: false, message: 'Invalid refund reason.' })
        }

        const appointment = await appointmentModel.findById(appointmentId)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found.' })
        }

        if (String(appointment.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'You can only request refunds for your own appointments.' })
        }

        if (!appointment.payment) {
            return res.status(400).json({ success: false, message: 'This appointment is not paid.' })
        }

        if (appointment.cancelled) {
            return res.status(400).json({ success: false, message: 'Cannot refund a cancelled appointment.' })
        }

        // Check if appointment is in the past (allow 30 minutes grace period).
        const appointmentDateTime = parseAppointmentDateTime(appointment.slotDate, appointment.slotTime)
        if (!appointmentDateTime) {
            return res.status(400).json({ success: false, message: 'Appointment date or time is invalid.' })
        }
        const now = new Date()
        if (now > appointmentDateTime && now - appointmentDateTime > 30 * 60 * 1000) {
            return res.status(400).json({ success: false, message: 'Cannot request a refund after the appointment time.' })
        }

        // Check if refund already exists
        const existingRefund = await refundModel.findOne({
            appointmentId,
            status: { $in: ['initiated', 'processing'] }
        })
        if (existingRefund) {
            return res.status(409).json({ success: false, message: 'A refund request is already in progress for this appointment.' })
        }

        // Get payment details
        const payment = await paymentModel.findOne({ appointmentId })
        if (!payment || !payment.razorpay_payment_id) {
            return res.status(400).json({ success: false, message: 'Payment details not found.' })
        }

        // Create refund record
        const refund = await refundModel.create({
            appointmentId,
            paymentId: payment._id,
            userId,
            docId: appointment.docId,
            amount: appointment.amount,
            reason: reason || 'user_request',
            description: description?.trim() || '',
            razorpay_payment_id: payment.razorpay_payment_id,
            status: 'initiated'
        })

        // Send notification email to user
        const user = await userModel.findById(userId).select('email name')
        if (user?.email) {
            sendMail({
                to: user.email,
                subject: 'Refund Request Received',
                html: `
                    <h2>Refund Request Confirmed</h2>
                    <p>Hi ${user.name},</p>
                    <p>We have received your refund request for the appointment scheduled on ${appointment.slotDate.replace(/_/g, '/')}.</p>
                    <p><strong>Refund Amount:</strong> ₹${appointment.amount}</p>
                    <p>We will process your refund within 3-5 business days. You will receive a confirmation email once the refund is completed.</p>
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Thank you!</p>
                `
            }).catch(() => {})
        }

        return res.status(201).json({
            success: true,
            message: 'Refund request submitted successfully. We will process it within 3-5 business days.',
            refund: {
                _id: refund._id,
                status: refund.status,
                amount: refund.amount,
                requestedAt: refund.requestedAt
            }
        })

    } catch (error) {
        console.error('[requestRefund]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

/**
 * Process a pending refund via Razorpay
 * Called by admin or scheduled task
 */
export const processRefund = async (req, res) => {
    try {
        const { refundId } = req.params

        if (!mongoose.isValidObjectId(refundId)) {
            return res.status(400).json({ success: false, message: 'Invalid refund ID.' })
        }

        const refund = await refundModel.findById(refundId)
        if (!refund) {
            return res.status(404).json({ success: false, message: 'Refund request not found.' })
        }

        // Claim the request before calling Razorpay. Only one worker can process it.
        const claimedRefund = await refundModel.findOneAndUpdate(
            { _id: refundId, status: 'initiated' },
            { $set: { status: 'processing' } },
            { new: true }
        )
        if (!claimedRefund) {
            return res.status(400).json({
                success: false,
                message: `Cannot process refund with status: ${refund.status}`
            })
        }

        const razorpayInstance = getRazorpayInstance()

        try {
            // Process refund via Razorpay
            const razorpayRefund = await razorpayInstance.payments.refund(
                claimedRefund.razorpay_payment_id,
                {
                    amount: Math.round(claimedRefund.amount * 100), // Convert to paise
                    receipt: claimedRefund._id.toString()
                }
            )

            // Keep the refund and appointment state consistent in one transaction.
            const session = await mongoose.startSession()
            const processedAt = new Date()
            try {
                await session.withTransaction(async () => {
                    const completed = await refundModel.findOneAndUpdate(
                        { _id: claimedRefund._id, status: 'processing' },
                        {
                            $set: {
                                status: 'completed',
                                razorpay_refund_id: razorpayRefund.id,
                                processedAt
                            }
                        },
                        { new: true, session }
                    )
                    if (!completed) throw new Error('Refund state changed while completing.')

                    const appointment = await appointmentModel.findOneAndUpdate(
                        { _id: claimedRefund.appointmentId, cancelled: false },
                        { $set: { cancelled: true, cancellationReason: 'Refund processed' } },
                        { new: true, session }
                    )
                    if (!appointment) throw new Error('Appointment could not be cancelled.')
                })
            } finally {
                await session.endSession()
            }

            // Send confirmation email
            const user = await userModel.findById(claimedRefund.userId).select('email name')
            if (user?.email) {
                sendMail({
                    to: user.email,
                    subject: 'Refund Processed Successfully',
                    html: `
                        <h2>Refund Completed</h2>
                        <p>Hi ${user.name},</p>
                        <p>Your refund has been successfully processed.</p>
                        <p><strong>Refund Amount:</strong> ₹${claimedRefund.amount}</p>
                        <p><strong>Refund ID:</strong> ${razorpayRefund.id}</p>
                        <p>The funds will appear in your original payment method within 3-5 business days.</p>
                        <p>Thank you for using our service!</p>
                    `
                }).catch(() => {})
            }

            return res.json({
                success: true,
                message: 'Refund processed successfully.',
                refund: {
                    _id: claimedRefund._id,
                    status: 'completed',
                    razorpay_refund_id: razorpayRefund.id,
                    processedAt
                }
            })

        } catch (razorpayError) {
            // Log refund failure
            await refundModel.findOneAndUpdate(
                { _id: claimedRefund._id, status: 'processing' },
                { $set: { status: 'failed', failureReason: razorpayError.message } }
            )

            console.error('[processRefund] Razorpay error:', razorpayError.message)
            return res.status(400).json({
                success: false,
                message: 'Failed to process refund via payment gateway.',
            })
        }

    } catch (error) {
        console.error('[processRefund]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

/**
 * Get refund status for a specific refund
 */
export const getRefundStatus = async (req, res) => {
    try {
        const { refundId } = req.params
        const userId = req.userId

        if (!mongoose.isValidObjectId(refundId)) {
            return res.status(400).json({ success: false, message: 'Invalid refund ID.' })
        }

        const refund = await refundModel.findById(refundId)
        if (!refund) {
            return res.status(404).json({ success: false, message: 'Refund request not found.' })
        }

        // Only user or admin can view refund status
        if (String(refund.userId) !== String(userId) && req.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized.' })
        }

        return res.json({
            success: true,
            refund: {
                _id: refund._id,
                amount: refund.amount,
                status: refund.status,
                reason: refund.reason,
                requestedAt: refund.requestedAt,
                processedAt: refund.processedAt,
                failureReason: refund.failureReason,
                razorpay_refund_id: refund.razorpay_refund_id
            }
        })

    } catch (error) {
        console.error('[getRefundStatus]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

/**
 * Get all refunds for a user
 */
export const getUserRefunds = async (req, res) => {
    try {
        const userId = req.userId
        const page = Math.max(1, Math.min(1000000, Number.parseInt(req.query.page, 10) || 1))
        const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 10))
        const { status } = req.query

        const filter = { userId }
        if (status) {
            filter.status = status
        }

        const skip = (page - 1) * limit
        const refunds = await refundModel
            .find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ requestedAt: -1 })
            .select('_id appointmentId amount status reason requestedAt processedAt')
            .lean()

        const total = await refundModel.countDocuments(filter)

        return res.json({
            success: true,
            refunds,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error('[getUserRefunds]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

/**
 * Admin endpoint to get all pending refunds
 */
export const getPendingRefunds = async (req, res) => {
    try {
        const page = Math.max(1, Math.min(1000000, Number.parseInt(req.query.page, 10) || 1))
        const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20))

        const skip = (page - 1) * limit
        const refunds = await refundModel
            .find({ status: { $in: ['initiated', 'processing'] } })
            .skip(skip)
            .limit(limit)
            .sort({ requestedAt: 1 })
            .populate('userId', 'name email')
            .populate('appointmentId', 'slotDate slotTime amount')
            .lean()

        const total = await refundModel.countDocuments({
            status: { $in: ['initiated', 'processing'] }
        })

        return res.json({
            success: true,
            refunds,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error('[getPendingRefunds]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export default {
    requestRefund,
    processRefund,
    getRefundStatus,
    getUserRefunds,
    getPendingRefunds
}
