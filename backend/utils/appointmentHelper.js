/**
 * Reserve a slot with automatic expiration
 * Prevents other users from booking the same slot for 5 minutes
 */
export const reserveSlot = async (docId, slotDate, slotTime, userId, session = null) => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minute reservation
    
    try {
        const lock = await appointmentLockModel.create(
            [{
                docId,
                slotDate,
                slotTime,
                userId,
                status: 'reserved',
                expiresAt
            }],
            { session }
        )
        
        return {
            lockId: lock[0]._id,
            expiresAt,
            success: true
        }
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error means slot is already reserved/confirmed
            return {
                success: false,
                message: 'This time slot is already booked or being reserved.'
            }
        }
        throw error
    }
}

/**
 * Confirm a reservation and create appointment
 */
export const confirmReservation = async (lockId, userId, appointmentData, session = null) => {
    // Update lock status to confirmed
    const lock = await appointmentLockModel.findOneAndUpdate(
        { _id: lockId, userId, status: 'reserved' },
        { status: 'confirmed', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24 hour confirmation
        { new: true, session }
    )

    if (!lock) {
        throw new Error('Reservation expired or invalid. Please try booking again.')
    }

    // Create the appointment
    const appointment = await appointmentModel.create([appointmentData], { session })
    return appointment[0]
}

/**
 * Release a slot reservation
 */
export const releaseSlot = async (lockId, session = null) => {
    await appointmentLockModel.findByIdAndUpdate(
        lockId,
        { status: 'released', expiresAt: Date.now() },
        { session }
    )
}

/**
 * Check if a slot is available
 */
export const isSlotAvailable = async (docId, slotDate, slotTime) => {
    // Check for active reservations or confirmed bookings
    const existingLock = await appointmentLockModel.findOne({
        docId,
        slotDate,
        slotTime,
        status: { $in: ['reserved', 'confirmed'] },
        expiresAt: { $gt: new Date() }
    })

    if (existingLock) {
        return {
            available: false,
            reason: 'Slot is already booked'
        }
    }

    // Check appointments
    const existingAppointment = await appointmentModel.findOne({
        docId,
        slotDate,
        slotTime,
        cancelled: false
    })

    if (existingAppointment) {
        return {
            available: false,
            reason: 'Slot is already booked'
        }
    }

    return { available: true }
}

/**
 * Get available slots for a doctor on a specific date
 */
export const getAvailableSlots = async (docId, slotDate) => {
    // Get doctor's available slots
    const doctor = await doctorModel.findById(docId).select('available')
    
    if (!doctor || !doctor.available) {
        return []
    }

    // Get all booked slots for this date (both reserved and confirmed)
    const bookedLocks = await appointmentLockModel.find({
        docId,
        slotDate,
        status: { $in: ['reserved', 'confirmed'] },
        expiresAt: { $gt: new Date() }
    }).select('slotTime').lean()

    const bookedAppointments = await appointmentModel.find({
        docId,
        slotDate,
        cancelled: false
    }).select('slotTime').lean()

    const bookedTimes = new Set([
        ...bookedLocks.map(l => l.slotTime),
        ...bookedAppointments.map(a => a.slotTime)
    ])

    // Standard clinic hours: 9 AM to 5 PM, 30-minute slots
    const allSlots = generateTimeSlots('09:00 AM', '05:00 PM', 30)
    const availableSlots = allSlots.filter(slot => !bookedTimes.has(slot))

    return availableSlots
}

/**
 * Generate time slots between start and end times
 */
const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
    const slots = []
    const [startHour, startMinute, startPeriod] = parseTime(startTime)
    const [endHour, endMinute, endPeriod] = parseTime(endTime)

    let current = convertTo24Hour(startHour, startMinute, startPeriod)
    const end = convertTo24Hour(endHour, endMinute, endPeriod)

    while (current < end) {
        const hour = Math.floor(current)
        const minute = Math.round((current - hour) * 60)
        const period = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        slots.push(`${displayHour}:${String(minute).padStart(2, '0')} ${period}`)
        current += intervalMinutes / 60
    }

    return slots
}

const parseTime = (timeStr) => {
    const match = /(\d{1,2}):(\d{2})\s(AM|PM)/.exec(timeStr)
    return [parseInt(match[1]), parseInt(match[2]), match[3]]
}

const convertTo24Hour = (hour, minute, period) => {
    if (period === 'AM' && hour === 12) hour = 0
    if (period === 'PM' && hour !== 12) hour += 12
    return hour + minute / 60
}

/**
 * Cleanup expired reservations
 * Should be run periodically by a cron job
 */
export const cleanupExpiredReservations = async () => {
    const deleted = await appointmentLockModel.deleteMany({
        status: 'reserved',
        expiresAt: { $lt: new Date() }
    })
    
    return deleted.deletedCount
}

export default {
    reserveSlot,
    confirmReservation,
    releaseSlot,
    isSlotAvailable,
    getAvailableSlots,
    cleanupExpiredReservations
}
