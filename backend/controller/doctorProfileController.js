import doctorModel from '../models/doctorModel.js'
import { isValidFee } from '../utils/validation.js'

export const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body
        const doctor = await doctorModel.findById(docId)
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' })
        await doctorModel.findByIdAndUpdate(docId, { available: !doctor.available })
        return res.json({ success: true, message: 'Availability updated.' })
    } catch (error) {
        console.error('[changeAvailability]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const changeAvailablity = changeAvailability

export const doctorList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(500, parseInt(req.query.limit) || 100)
        const speciality = req.query.speciality || ''
        const skip = (page - 1) * limit

        const filter = {}
        if (speciality) filter.speciality = new RegExp(speciality, 'i')

        const doctors = await doctorModel
            .find(filter)
            .select(['-password', '-email'])
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await doctorModel.countDocuments(filter)

        return res.json({
            success: true,
            doctors,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('[doctorList]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const doctorProfile = async (req, res) => {
    try {
        const profileData = await doctorModel.findById(req.docId).select('-password')
        if (!profileData) return res.status(404).json({ success: false, message: 'Doctor not found.' })
        return res.json({ success: true, profileData })
    } catch (error) {
        console.error('[doctorProfile]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const updateDoctorProfile = async (req, res) => {
    try {
        const { address, fees, available } = req.body
        if (fees !== undefined && !isValidFee(fees)) return res.status(400).json({ success: false, message: 'Fees must be a positive amount.' })
        const updateData = { address, available }
        if (fees !== undefined) updateData.fees = Number(fees)
        await doctorModel.findByIdAndUpdate(req.docId, updateData)
        return res.json({ success: true, message: 'Profile updated.' })
    } catch (error) {
        console.error('[updateDoctorProfile]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const incrementView = async (req, res) => {
    try {
        const doctor = await doctorModel.findByIdAndUpdate(req.params.docId, { $inc: { views: 1 } }, { new: true })
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' })
        return res.json({ success: true, views: doctor.views })
    } catch (error) {
        console.error('[incrementView]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export const toggleLike = async (req, res) => {
    try {
        const { docId } = req.params
        const doctor = await doctorModel.findById(docId).select('likedBy likes')
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' })

        const removed = await doctorModel.findOneAndUpdate(
            { _id: docId, likedBy: req.userId },
            { $inc: { likes: -1 }, $pull: { likedBy: req.userId } },
            { new: true }
        )
        if (removed) return res.json({ success: true, liked: false, message: 'Like removed.' })

        const added = await doctorModel.findOneAndUpdate(
            { _id: docId, likedBy: { $ne: req.userId } },
            { $inc: { likes: 1 }, $addToSet: { likedBy: req.userId } },
            { new: true }
        )
        return res.json(added
            ? { success: true, liked: true, message: 'Liked successfully.' }
            : { success: true, liked: true, message: 'Already liked.' })
    } catch (error) {
        console.error('[toggleLike]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}
