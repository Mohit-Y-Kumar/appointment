const requiredEnv = [
    'JWT_SECRET',
    'MONGO_URI',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD_HASH',
    'FRONTEND_URL',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET'
]

const productionRequiredEnv = [
    'APP_URL',
    'ALLOWED_ORIGINS'
]

const optionalEnv = [
    'NODE_ENV',
    'PORT',
    'ALLOWED_ORIGINS',
    'LOG_LEVEL',
    'CURRENCY',
    'GROQ_API_KEY',
    'GROQ_MODEL',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'MONGO_TRANSACTIONS_REQUIRED',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_USER'
]

export const validateEnv = (customRequired = [], customOptional = []) => {
    const required = [...requiredEnv, ...(process.env.NODE_ENV === 'production' ? productionRequiredEnv : []), ...customRequired]
    const optional = [...optionalEnv, ...customOptional]
    const missing = []

    if (process.env.NODE_ENV === 'test') {
        return {
            required,
            optional,
            provided: [],
            missing: [],
            isValid: true
        }
    }

    for (const key of required) {
        const value = process.env[key]
        if (value === undefined || value === null || String(value).trim() === '') {
            missing.push(key)
        }
    }

    const hasOAuthConfig = Boolean(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN &&
        process.env.GOOGLE_USER
    )

    if (!hasOAuthConfig) {
        missing.push('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GOOGLE_USER')
    }

    if (process.env.NODE_ENV === 'production') {
        const jwtSecret = process.env.JWT_SECRET
        if (jwtSecret && jwtSecret.length < 32) {
            missing.push('JWT_SECRET (must be at least 32 characters)')
        }
    }

    const provided = []
    for (const key of [...required, ...optional]) {
        if (process.env[key] !== undefined && process.env[key] !== null && String(process.env[key]).trim() !== '') {
            provided.push(key)
        }
    }

    if (missing.length > 0) {
        const error = new Error(`Missing required environment variables: ${missing.join(', ')}`)
        error.missingEnv = missing
        throw error
    }

    return {
        required,
        optional,
        provided,
        missing,
        isValid: missing.length === 0
    }
}

export default validateEnv
