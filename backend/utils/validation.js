import validator from 'validator'

export const isValidFee = value => {
    const fee = Number(value)
    return Number.isFinite(fee) && fee > 0 && fee <= 10000000
}

export const isValidAppointmentDate = value => {
    const match = /^(\d{1,2})_(\d{1,2})_(\d{4})$/.exec(value || '')
    if (!match) return false
    const [, day, month, year] = match.map(Number)
    const date = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date >= today
}

export const isValidSlotTime = value => /^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/.test(value || '')

export const parseAppointmentDateTime = (slotDate, slotTime) => {
    const dateMatch = /^(\d{1,2})_(\d{1,2})_(\d{4})$/.exec(slotDate || '')
    const timeMatch = /^(0?[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/.exec(slotTime || '')
    if (!dateMatch || !timeMatch) return null

    const [, dayText, monthText, yearText] = dateMatch
    const [, hourText, minuteText, meridiem] = timeMatch
    const day = Number(dayText)
    const month = Number(monthText)
    const year = Number(yearText)
    let hour = Number(hourText)
    const minute = Number(minuteText)

    if (meridiem === 'PM' && hour !== 12) hour += 12
    if (meridiem === 'AM' && hour === 12) hour = 0

    const appointmentDateTime = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (appointmentDateTime.getFullYear() !== year || appointmentDateTime.getMonth() !== month - 1 || appointmentDateTime.getDate() !== day) return null
    return appointmentDateTime
}


export const isValidAddress = address => {
    if (!address || typeof address !== 'object') return false
    
    const line1 = address.line1?.toString().trim() || ''
    const line2 = address.line2?.toString().trim() || ''
    const city = address.city?.toString().trim() || ''
    const state = address.state?.toString().trim() || ''
    const pincode = address.pincode?.toString().trim() || ''
    
    if (!line1 || line1.length < 5 || line1.length > 200) return false
    
    if (line2.length > 200) return false
    
    if (!city || city.length < 2 || city.length > 50) return false
    
    if (!state || state.length < 2 || state.length > 50) return false
    
    // Validate pincode (required, 6 digit Indian pincode or valid postal code)
    if (!pincode || !/^\d{5,6}$/.test(pincode)) return false
    
    return true
}


export const sanitizeInput = (input, maxLength = 5000) => {
    if (!input || typeof input !== 'string') return ''
    
    let sanitized = input.trim().slice(0, maxLength)
    
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    sanitized = sanitized.replace(/<img\b[^<]*(?:(?!>)<[^<]*)*>/gi, '')
    sanitized = sanitized.replace(/on\w+\s*=/gi, '')
    
    // Escape HTML entities
    sanitized = validator.escape(sanitized)
    
    return sanitized
}


export const sanitizeChatMessage = (message) => {
    return sanitizeInput(message, 5000)
}


export const sanitizeComment = (comment) => {
    return sanitizeInput(comment, 1000)
}


export const sanitizeProfileText = (text) => {
    return sanitizeInput(text, 500)
}
