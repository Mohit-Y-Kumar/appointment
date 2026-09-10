import express from 'express'
import authParticipant from '../middleware/authParticipant.js'
import { getCallHistory, startCall, updateCallStatus } from '../controller/callController.js'

const callRouter = express.Router()

callRouter.post('/start',          authParticipant, startCall)
callRouter.put('/status',          authParticipant, updateCallStatus)
callRouter.get('/history/:userId', authParticipant, (req, res, next) => {
	if (req.params.userId !== req.participantId) {
		return res.status(403).json({ success: false, message: 'You can only view your own call history.' })
	}
	next()
}, getCallHistory)

export default callRouter
