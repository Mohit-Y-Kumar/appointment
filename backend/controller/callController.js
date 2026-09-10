import callModel from '../models/callModel.js'
import appointmentModel from '../models/appointmentModel.js'
import mongoose from 'mongoose'

const getRoomParticipants = (roomId) => {
    const match = /^(?:chat|call)_([a-f\d]{24})_([a-f\d]{24})$/i.exec(roomId || '')
    return match ? { doctorId: match[1], userId: match[2] } : null
}

// ─── Start Call ───────────────────────────────────────────────────────────────
const startCall = async (req, res) => {
    try {
        const { roomId, callType, appointmentId } = req.body
        const participants = getRoomParticipants(roomId)

        if (!participants || !mongoose.isValidObjectId(appointmentId)) {
            return res.status(400).json({ success: false, message: 'Valid roomId is required.' })
        }

        const isParticipant = req.participantRole === 'doctor'
            ? req.participantId === participants.doctorId
            : req.participantId === participants.userId
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Call participant access required.' })
        }

        const isDoctor = req.participantRole === 'doctor'
        const callerId = req.participantId
        const callerModel = req.participantRole
        const receiverId = isDoctor ? participants.userId : participants.doctorId
        const receiverModel = isDoctor ? 'user' : 'doctor'
        const appointment = await appointmentModel.findOne({
            _id: appointmentId,
            userId: participants.userId,
            docId: participants.doctorId,
            cancelled: false
        }).select('_id')
        if (!appointment) {
            return res.status(403).json({ success: false, message: 'Active appointment required.' })
        }

        const existingCall = await callModel.findOne({ roomId })
        if (existingCall) {
            return res.status(409).json({ success: false, message: 'A call with this roomId already exists.' })
        }

        const newCall = await callModel.create({
            roomId,
            callerId,
            callerModel,
            receiverId,
            receiverModel,
            callType:      callType === 'video' ? 'video' : 'audio',
            status:        'ringing',
            appointmentId: appointment._id
        })

        return res.status(201).json({ success: true, message: 'Call started.', call: newCall })

    } catch (error) {
        console.error('[startCall]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

// ─── Call History ─────────────────────────────────────────────────────────────
const getCallHistory = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, parseInt(req.query.limit) || 10)
        const skip = (page - 1) * limit

        const query = {
            $or: [
                { callerId: req.participantId, callerModel: req.participantRole },
                { receiverId: req.participantId, receiverModel: req.participantRole }
            ]
        }

        const calls = await callModel
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await callModel.countDocuments(query)

        return res.json({
            success: true,
            calls,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error('[getCallHistory]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

// ─── Update Call Status ───────────────────────────────────────────────────────
const updateCallStatus = async (req, res) => {
    try {
        const { roomId, status } = req.body
        const validStatuses      = ['ringing', 'accepted', 'rejected', 'ended', 'missed']

        if (!roomId || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}.` })
        }

        const updateData = { status }
        if (status === 'accepted') updateData.startedAt = new Date()
        if (['ended', 'rejected', 'missed'].includes(status)) updateData.endedAt = new Date()

        const call = await callModel.findOne({
            roomId,
            $or: [
                { callerId: req.participantId, callerModel: req.participantRole },
                { receiverId: req.participantId, receiverModel: req.participantRole }
            ]
        })
        if (!call) {
            return res.status(404).json({ success: false, message: 'Call not found.' })
        }

        const appointment = await appointmentModel.findOne({
            _id: call.appointmentId,
            userId: call.callerModel === 'user' ? call.callerId : call.receiverId,
            docId: call.callerModel === 'doctor' ? call.callerId : call.receiverId,
            cancelled: false
        }).select('_id')
        if (!appointment) {
            return res.status(403).json({ success: false, message: 'Active appointment required.' })
        }

        const isCaller = String(call.callerId) === String(req.participantId) && call.callerModel === req.participantRole
        const allowedTransitions = {
            ringing: ['accepted', 'rejected', 'missed', 'ended'],
            accepted: ['ended'],
            rejected: [],
            missed: [],
            ended: []
        }
        if (!allowedTransitions[call.status]?.includes(status)) {
            return res.status(409).json({ success: false, message: `Cannot change call from ${call.status} to ${status}.` })
        }
        if (['accepted', 'rejected', 'missed'].includes(status) && isCaller) {
            return res.status(403).json({ success: false, message: 'Only the receiver can respond to a call.' })
        }

        Object.assign(call, updateData)
        await call.save()

        return res.json({ success: true, call })

    } catch (error) {
        console.error('[updateCallStatus]', error.message)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export { startCall, getCallHistory, updateCallStatus }
