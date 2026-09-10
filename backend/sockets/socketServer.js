import jwt from 'jsonwebtoken'
import appointmentModel from '../models/appointmentModel.js'
import callModel from '../models/callModel.js'
import messageModel from '../models/messageModel.js'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import refreshTokenModel from '../models/refreshTokenModel.js'
import { cookieNames } from '../utils/authTokens.js'
import { sanitizeChatMessage } from '../utils/validation.js'

const parseCookieToken = (header, names) => {
    const item = header?.split(';').map(value => value.trim()).find(value => names.includes(value.split('=')[0]))
    if (!item) return null
    const name = item.split('=')[0]
    try {
        return decodeURIComponent(item.slice(`${name}=`.length)) || null
    } catch {
        return null
    }
}

const roomParticipants = roomId => {
    const match = /^(?:chat|call)_([a-f\d]{24})_([a-f\d]{24})$/i.exec(roomId || '')
    return match ? { doctorId: match[1], userId: match[2] } : null
}

const canAccessRoom = async (socket, roomId) => {
    const pair = roomParticipants(roomId)
    const appointmentMatch = /^(?:chat|call)_([a-f\d]{24})$/i.exec(roomId || '')
    if (!pair && !appointmentMatch) return null

    const appointment = pair
        ? await appointmentModel.findOne({ userId: pair.userId, docId: pair.doctorId, cancelled: false }).select('_id userId docId').lean()
        : await appointmentModel.findOne({ _id: appointmentMatch[1], cancelled: false }).select('_id userId docId').lean()
    if (!appointment) return null

    const isParticipant = socket.data.role === 'doctor'
        ? socket.data.userId === String(appointment.docId)
        : socket.data.userId === String(appointment.userId)
    return isParticipant ? appointment : null
}

const authorizeSocketRoom = async (socket, roomId) => {
    if (typeof roomId !== 'string' || !socket.rooms.has(roomId)) return null
    const appointment = await canAccessRoom(socket, roomId)
    if (!appointment) {
        socket.leave(roomId)
        socket.emit('socket-error', { message: 'Appointment access revoked.' })
        return null
    }
    return appointment
}

const createEventLimiter = (maxEvents, windowMs) => {
    let timestamps = []
    return () => {
        const now = Date.now()
        timestamps = timestamps.filter(timestamp => now - timestamp < windowMs)
        if (timestamps.length >= maxEvents) return false
        timestamps.push(now)
        return true
    }
}

const authenticateSocket = async (socket, next) => {
    try {
        const accessNames = [cookieNames('user').access, cookieNames('doctor').access]
        const token = parseCookieToken(socket.handshake.headers.cookie, accessNames)
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!['user', 'doctor'].includes(decoded.role) || !decoded.jti) return next(new Error('Socket authentication failed'))

        const session = await refreshTokenModel.findOne({
            tokenId: decoded.jti,
            subjectId: String(decoded.id),
            role: decoded.role,
            revokedAt: null,
            expiresAt: { $gt: new Date() }
        }).lean()
        if (!session) return next(new Error('Socket authentication failed'))

        const model = decoded.role === 'doctor' ? doctorModel : userModel
        const account = await model.findById(decoded.id).select('name').lean()
        if (!account) return next(new Error('Socket authentication failed'))

        socket.data.userId = String(decoded.id)
        socket.data.role = decoded.role
        socket.data.name = account.name
        socket.data.tokenId = decoded.jti
        socket.data.lastAuthCheck = Date.now()
        next()
    } catch {
        next(new Error('Socket authentication failed'))
    }
}

/**
 * Re-validate socket authentication
 * Checks if the user's token is still valid and not revoked
 * Should be called periodically or on important operations
 */
const revalidateSocketAuth = async (socket, force = false) => {
    try {
        // Check if enough time has passed since last auth check (5 minutes)
        const now = Date.now()
        if (!force && now - socket.data.lastAuthCheck < 5 * 60 * 1000) {
            return true
        }

        // Re-check token validity
        const session = await refreshTokenModel.findOne({
            tokenId: socket.data.tokenId,
            subjectId: socket.data.userId,
            role: socket.data.role,
            revokedAt: null,
            expiresAt: { $gt: new Date() }
        }).lean()

        if (!session) {
            return false
        }

        socket.data.lastAuthCheck = now
        return true
    } catch (error) {
        console.error('[revalidateSocketAuth] error:', error.message)
        return false
    }
}

const requireSocketAuth = async socket => {
    const isAuthValid = await revalidateSocketAuth(socket, true)
    if (isAuthValid) return true
    socket.emit('socket-error', { message: 'Authentication expired. Please refresh the page.' })
    socket.disconnect()
    return false
}

const registerSocketHandlers = io => {
    io.use(authenticateSocket)

    io.on('connection', socket => {
        console.log('[Socket] Connected:', socket.id)
        const eventLimiters = {
            chat: createEventLimiter(30, 10_000),
            typing: createEventLimiter(20, 10_000),
            call: createEventLimiter(10, 60_000),
            signal: createEventLimiter(100, 10_000)
        }

        socket.on('join-room', async roomId => {
            if (!(await requireSocketAuth(socket))) return
            if (typeof roomId !== 'string' || !(await canAccessRoom(socket, roomId))) {
                return socket.emit('socket-error', { message: 'Room access denied.' })
            }
            socket.join(roomId)
        })

        socket.on('call-user', async data => {
            try {
                // Re-validate socket authentication
                if (!(await requireSocketAuth(socket))) return
                
                const appointment = await authorizeSocketRoom(socket, data?.roomId)
                if (!eventLimiters.call() || !appointment) return
                const participants = roomParticipants(data.roomId)
                if (!participants) return
                const callerId = socket.data.userId
                const callerModel = socket.data.role
                const receiverId = callerModel === 'doctor' ? participants.userId : participants.doctorId
                const receiverModel = callerModel === 'doctor' ? 'user' : 'doctor'
                const existing = await callModel.findOne({ roomId: data.roomId })
                if (existing && String(existing.appointmentId) !== String(appointment._id)) return
                if (!existing) {
                    await callModel.create({
                        roomId: data.roomId,
                        callerId,
                        callerModel,
                        receiverId,
                        receiverModel,
                        appointmentId: appointment._id,
                        callType: data.callType === 'video' ? 'video' : 'audio',
                        status: 'ringing'
                    })
                } else {
                    await callModel.findOneAndUpdate({ roomId: data.roomId, appointmentId: appointment._id }, { status: 'ringing', endedAt: null, startedAt: null })
                }
                socket.to(data.roomId).emit('incoming-call', {
                    roomId: data.roomId,
                    callerName: socket.data.name,
                    callerImage: data.callerImage,
                    callType: data.callType === 'video' ? 'video' : 'audio',
                    callerId
                })
            } catch (error) {
                console.error('[call-user] error:', error.message)
            }
        })

        socket.on('call-accepted', async ({ roomId } = {}) => {
            try {
                if (!(await requireSocketAuth(socket))) return
                const appointment = await authorizeSocketRoom(socket, roomId)
                if (!eventLimiters.call() || !appointment) return
                await callModel.findOneAndUpdate({ roomId, appointmentId: appointment._id }, { status: 'accepted', startedAt: new Date() })
                socket.to(roomId).emit('call-accepted', { roomId })
            } catch (error) { console.error('[call-accepted] error:', error.message) }
        })

        socket.on('call-rejected', async ({ roomId } = {}) => {
            try {
                if (!(await requireSocketAuth(socket))) return
                const appointment = await authorizeSocketRoom(socket, roomId)
                if (!eventLimiters.call() || !appointment) return
                await callModel.findOneAndUpdate({ roomId, appointmentId: appointment._id }, { status: 'rejected' })
                socket.to(roomId).emit('call-rejected', { roomId })
            } catch (error) { console.error('[call-rejected] error:', error.message) }
        })

        socket.on('call-ended', async ({ roomId } = {}) => {
            try {
                if (!(await requireSocketAuth(socket))) return
                const appointment = await authorizeSocketRoom(socket, roomId)
                if (!eventLimiters.call() || !appointment) return
                const call = await callModel.findOne({ roomId, appointmentId: appointment._id })
                if (call) {
                    call.status = 'ended'
                    call.endedAt = new Date()
                    await call.save()
                }
                socket.to(roomId).emit('call-ended', { roomId })
            } catch (error) { console.error('[call-ended] error:', error.message) }
        })

        socket.on('signal', async ({ roomId, signalData } = {}) => {
            if (await requireSocketAuth(socket) && eventLimiters.signal() && signalData && await authorizeSocketRoom(socket, roomId)) socket.to(roomId).emit('signal', { signalData })
        })

        socket.on('send-message', async data => {
            try {
                if (!eventLimiters.chat() || !data || typeof data.message !== 'string') return
                
                // Re-validate socket authentication
                if (!(await requireSocketAuth(socket))) return
                
                const appointment = await authorizeSocketRoom(socket, data.roomId)
                if (!appointment) return
                
                const saved = await messageModel.create({
                    roomId: data.roomId,
                    sender: socket.data.userId,
                    senderType: socket.data.role,
                    name: socket.data.name,
                    message: sanitizeChatMessage(data.message),
                    imageUrl: typeof data.imageUrl === 'string' && /^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\//i.test(data.imageUrl) ? data.imageUrl.slice(0, 2048) : null,
                    isRead: false,
                    readAt: null,
                    time: new Date()
                })
                io.to(data.roomId).emit('receive-message', saved)
            } catch (error) { console.error('[send-message] error:', error.message) }
        })

        socket.on('message-read', async data => {
            try {
                if (!(await requireSocketAuth(socket))) return
                if (!eventLimiters.chat() || !data || !(await authorizeSocketRoom(socket, data.roomId))) return
                await messageModel.updateMany({ roomId: data.roomId, sender: { $ne: socket.data.userId }, isRead: false }, { isRead: true, readAt: new Date() })
                io.to(data.roomId).emit('message-seen', { roomId: data.roomId, readBy: socket.data.userId, readAt: new Date() })
            } catch (error) { console.error('[message-read] error:', error.message) }
        })

        socket.on('typing', async data => {
            if (await requireSocketAuth(socket) && eventLimiters.typing() && data && await authorizeSocketRoom(socket, data.roomId)) socket.to(data.roomId).emit('user-typing', { name: socket.data.name })
        })
        socket.on('stop-typing', async data => {
            if (await requireSocketAuth(socket) && eventLimiters.typing() && data && await authorizeSocketRoom(socket, data.roomId)) socket.to(data.roomId).emit('user-stop-typing')
        })

        socket.on('disconnect', () => console.log(' Disconnected:', socket.id))
    })
}

export default registerSocketHandlers