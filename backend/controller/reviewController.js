import reviewModel from '../models/reviewModel.js'
import appointmentModel from '../models/appointmentModel.js'
import mongoose from 'mongoose'
import { sanitizeComment } from '../utils/validation.js'

// ─── Submit Rating ────────────────────────────────────────────────────────────
const submitRating = async (req, res) => {
    try {
        const { doctorId, appointmentId, rating } = req.body
        const patientId = req.userId

        if (!mongoose.isValidObjectId(doctorId) || !mongoose.isValidObjectId(appointmentId)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor or appointment ID.' })
        }
        const numericRating = Number(rating)
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' })
        }

        const appointment = await appointmentModel.findById(appointmentId)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found.' })
        }

        if (!appointment.isCompleted || !appointment.payment || appointment.cancelled) {
            return res.status(400).json({ success: false, message: 'You can only rate after a completed, paid appointment.' })
        }

        if (appointment.userId.toString() !== patientId) {
            return res.status(403).json({ success: false, message: 'You can only rate your own appointments.' })
        }

        if (appointment.docId.toString() !== String(doctorId)) {
            return res.status(403).json({ success: false, message: 'You can only rate the doctor from your appointment.' })
        }

        let review = await reviewModel.findOne({ appointment: appointmentId })

        if (review) {
            review.rating  = numericRating
            review.isRated = true
            await review.save()
            return res.json({ success: true, message: 'Rating updated. You can now add a comment.', reviewId: review._id, step: 'rating_done' })
        }

        review = await new reviewModel({
            doctor:      doctorId,
            patient:     patientId,
            appointment: appointmentId,
            rating: numericRating,
            isRated:     true,
            isReviewed:  false
        }).save()

        return res.status(201).json({ success: true, message: 'Rating submitted. You can now write a review.', reviewId: review._id, step: 'rating_done' })

    } catch (error) {
        console.error('[submitRating]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

// ─── Submit Comment ───────────────────────────────────────────────────────────
const submitComment = async (req, res) => {
    try {
        const { reviewId }  = req.params
        const { comment }   = req.body
        const patientId     = req.userId

        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({ success: false, message: 'Invalid review ID.' })
        }
        if (!comment || !comment.trim()) {
            return res.status(400).json({ success: false, message: 'Comment cannot be empty.' })
        }

        const review = await reviewModel.findById(reviewId)
        if (!review) {
            return res.status(404).json({ success: false, message: 'Please submit a star rating first.' })
        }

        if (review.patient.toString() !== patientId) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' })
        }

        if (!review.isRated) {
            return res.status(400).json({ success: false, message: 'Please submit a star rating before adding a comment.' })
        }

        if (review.isReviewed) {
            return res.status(409).json({ success: false, message: 'You have already commented. Use the edit endpoint to update.' })
        }

        review.comment    = sanitizeComment(comment)
        review.isReviewed = true
        await review.save()

        return res.json({ success: true, message: 'Review submitted successfully.', review, step: 'review_done' })

    } catch (error) {
        console.error('[submitComment]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

// ─── Edit Review ──────────────────────────────────────────────────────────────
const editReview = async (req, res) => {
    try {
        const { id }              = req.params
        const { rating, comment } = req.body
        const patientId           = req.userId

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid review ID.' })
        }
        const review = await reviewModel.findById(id)
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' })
        }

        if (review.patient.toString() !== patientId) {
            return res.status(403).json({ success: false, message: 'You can only edit your own review.' })
        }

        if (rating !== undefined) {
            const numericRating = Number(rating)
            if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
                return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' })
            }
            review.rating = numericRating
        }

        if (comment !== undefined) {
            if (typeof comment !== 'string' || !comment.trim()) {
                return res.status(400).json({ success: false, message: 'Comment cannot be empty.' })
            }
            review.comment    = comment.trim().slice(0, 500)
            review.isReviewed = true
        }

        await review.save()
        return res.json({ success: true, message: 'Review updated successfully.', review })

    } catch (error) {
        console.error('[editReview]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

// ─── Delete Review ────────────────────────────────────────────────────────────
const deleteReview = async (req, res) => {
    try {
        const { id }    = req.params
        const patientId = req.userId

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid review ID.' })
        }
        const review = await reviewModel.findById(id)
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' })
        }

        if (review.patient.toString() !== patientId) {
            return res.status(403).json({ success: false, message: 'You can only delete your own review.' })
        }

        await reviewModel.findByIdAndDelete(id)
        return res.json({ success: true, message: 'Review deleted.' })

    } catch (error) {
        console.error('[deleteReview]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

// ─── Get Doctor Reviews ───────────────────────────────────────────────────────
const getDoctorReviews = async (req, res) => {
    try {
        const { id } = req.params
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, parseInt(req.query.limit) || 10)
        const skip = (page - 1) * limit

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor ID.' })
        }

        const reviews = await reviewModel
            .find({ doctor: id })
            .populate('patient', 'name image')
            .select('rating comment isRated isReviewed createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const breakdown = await reviewModel.aggregate([
            { $match: { doctor: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: '$rating', count: { $sum: 1 } } }
        ])

        const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        breakdown.forEach(item => { ratingBreakdown[item._id] = item.count })

        const totalReviews = await reviewModel.countDocuments({ doctor: id })
        const averageRating = totalReviews > 0
            ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : 0

        return res.json({
            success: true,
            summary: { averageRating, totalReviews, ratingBreakdown },
            reviews,
            pagination: {
                total: totalReviews,
                page,
                limit,
                pages: Math.ceil(totalReviews / limit)
            }
        })

    } catch (error) {
        console.error('[getDoctorReviews]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export { submitRating, submitComment, editReview, deleteReview, getDoctorReviews }
