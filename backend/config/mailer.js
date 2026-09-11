import nodemailer from 'nodemailer'

const gmailUser = process.env.GOOGLE_USER || process.env.EMAIL_USER
const hasOAuthCredentials = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    gmailUser
)

const baseTimeouts = {
    pool: true,
    maxConnections: 5,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
}

const gmailOAuthConfig = {
    type: 'OAuth2',
    user: gmailUser,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
}

const gmailSmtpConfig = {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
}

const oauthTransport = hasOAuthCredentials
    ? nodemailer.createTransport({ service: 'gmail', auth: gmailOAuthConfig, ...baseTimeouts })
    : null

const smtpTransport = process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({ service: 'gmail', auth: gmailSmtpConfig.auth, ...baseTimeouts })
    : null

export const sendMail = async ({ to, subject, html }) => {
    const mailOptions = {
        from: `"DocNest" <${gmailUser || process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    }

    const attempts = []
    if (oauthTransport) attempts.push({ label: 'oauth', transport: oauthTransport })
    if (smtpTransport) attempts.push({ label: 'smtp', transport: smtpTransport })

    if (attempts.length === 0) {
        console.error('[Mailer] No valid Gmail credentials configured. Missing GOOGLE_* or EMAIL_USER/EMAIL_PASS.')
        return false
    }

    let lastError = null

    for (const attempt of attempts) {
        try {
            await attempt.transport.verify()
            await attempt.transport.sendMail(mailOptions)
            console.log(`[Mailer] Email sent via ${attempt.label} to ${to}`)
            return true
        } catch (error) {
            lastError = error
            console.error(`[Mailer] ${attempt.label} send failed: ${error.message}`)
            if (error.code === 'EAUTH' || /invalid_grant|oauth|authentication/i.test(error.message)) {
                console.error('[Mailer] Gmail OAuth credentials appear invalid or expired. Generate a fresh Google refresh token for the same Gmail account.')
            }
        }
    }

    console.error('[Mailer] All Gmail delivery attempts failed.', lastError?.message || 'Unknown error')
    return false
}

export default oauthTransport || smtpTransport || nodemailer.createTransport({ service: 'gmail', ...baseTimeouts })