import userModel from '../models/userModel.js'
import { v2 as cloudinary } from 'cloudinary'
import { unlink } from 'fs/promises'

export const getProfile = async (req, res) => {
	try {
		const userData = await userModel.findById(req.userId).select('-password')
		if (!userData) return res.status(404).json({ success: false, message: 'User not found.' })
		return res.json({ success: true, userData })
	} catch (error) {
		console.error('[getProfile]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	}
}

export const updateProfile = async (req, res) => {
	try {
		const { name, phone, address, dob, gender } = req.body
		if (!name || !phone || !address || !dob || !gender) {
			return res.status(400).json({ success: false, message: 'All profile fields are required.' })
		}

		let parsedAddress
		try {
			parsedAddress = JSON.parse(address)
		} catch {
			return res.status(400).json({ success: false, message: 'Invalid address format.' })
		}

		await userModel.findByIdAndUpdate(req.userId, { name, phone, address: parsedAddress, dob, gender })
		if (req.file) {
			const imageUpload = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' })
			await userModel.findByIdAndUpdate(req.userId, { image: imageUpload.secure_url })
		}
		return res.json({ success: true, message: 'Profile updated successfully.' })
	} catch (error) {
		console.error('[updateProfile]', error.message)
		return res.status(500).json({ success: false, message: 'Internal server error.' })
	} finally {
		if (req.file?.path) await unlink(req.file.path).catch(() => {})
	}
}
