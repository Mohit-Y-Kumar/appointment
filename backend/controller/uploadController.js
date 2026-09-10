import appointmentModel from '../models/appointmentModel.js'
import { unlink } from 'fs/promises'
import { v2 as cloudinary } from 'cloudinary'

const uploadChatImage = async (req, res) => {
    try {
        const imageFile = req.file
        if (!imageFile) {
            return res.status(400).json({ success: false, message: 'Image file is required.' })
        }

        const { roomId } = req.body

        const match = /^(?:chat|call)_([a-f\d]{24})_([a-f\d]{24})$/i.exec(roomId || '')
        if (!match) {
            return res.status(400).json({ success: false, message: 'Valid roomId is required.' })
        }

        const [, doctorId, userId] = match
        const expectedId = req.participantRole === 'doctor' ? doctorId : userId
        if (req.participantId !== expectedId || !await appointmentModel.exists({ userId, docId: doctorId, cancelled: false })) {
            return res.status(403).json({ success: false, message: 'Room access denied.' })
        }

        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
            resource_type: 'image',
            folder:        'chat_images'
        })

        return res.status(201).json({ success: true, imageUrl: imageUpload.secure_url })

    } catch (error) {
        console.error('[uploadChatImage]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    } finally {
        if (req.file?.path) await unlink(req.file.path).catch(() => {})
    }
}

export default uploadChatImage
