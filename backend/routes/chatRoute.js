import express from 'express'
import chat from '../controller/chatController.js'
import messageModel from '../models/messageModel.js'
import uploadChatImage from '../controller/uploadController.js'
import upload from '../middleware/multer.js'
import authParticipant from '../middleware/authParticipant.js'
import appointmentModel from '../models/appointmentModel.js'
import { aiLimiter } from '../middleware/rateLimiters.js'
import authUser from '../middleware/authUser.js'
import { sanitizeChatMessage } from '../utils/validation.js'

const chatRouter = express.Router()

chatRouter.post('/message', aiLimiter, authUser, chat)

chatRouter.post('/upload-image', authParticipant, upload.single('image'), uploadChatImage)

const canAccessRoom = async (participantId, participantRole, roomId) => {
    const match = /^(?:chat|call)_([a-f\d]{24})_([a-f\d]{24})$/i.exec(roomId)
    if (!match) {
        const appointmentId = /^(?:chat|call)_?([a-f\d]{24})$/i.exec(roomId || '')?.[1]
        if (!appointmentId || participantRole !== 'user') return false
        return Boolean(await appointmentModel.exists({
            _id: appointmentId,
            userId: participantId,
            cancelled: false
        }))
    }

    const [, doctorId, userId] = match
    const isParticipant = participantRole === 'doctor'
        ? participantId === doctorId
        : participantId === userId
    if (!isParticipant) return false

    return Boolean(await appointmentModel.exists({
        userId,
        docId: doctorId,
        cancelled: false
    }))
}

// Message history for a room 
chatRouter.get('/history/:roomId', authParticipant, async (req, res) => {
    try {
        if (!(await canAccessRoom(req.participantId, req.participantRole, req.params.roomId))) {
            return res.status(403).json({ success: false, message: 'Room access denied.' })
        }
        const page  = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, parseInt(req.query.limit) || 50)
        const skip  = (page - 1) * limit

        const messages = await messageModel
            .find({ roomId: req.params.roomId })
            .sort({ time: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        // Sanitize messages on retrieval for defense-in-depth
        const sanitizedMessages = messages.map(msg => ({
            ...msg,
            message: sanitizeChatMessage(msg.message)
        }))

        return res.json({ success: true, messages: sanitizedMessages.reverse(), page, limit })
    } catch (err) {
        console.error('[chat/history]', err.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
})

// Mark messages as read
chatRouter.put('/mark-read/:roomId', authParticipant, async (req, res) => {
    try {
        if (!(await canAccessRoom(req.participantId, req.participantRole, req.params.roomId))) {
            return res.status(403).json({ success: false, message: 'Room access denied.' })
        }

        await messageModel.updateMany(
            { roomId: req.params.roomId, sender: { $ne: req.participantId }, isRead: false },
            { isRead: true, readAt: new Date() }
        )

        return res.json({ success: true, message: 'Messages marked as read.' })
    } catch (err) {
        console.error('[chat/mark-read]', err.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
})

export default chatRouter
