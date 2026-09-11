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

const oauthTransport = hasOAuthCredentials
    ? nodemailer.createTransport({ service: 'gmail', auth: gmailOAuthConfig, ...baseTimeouts })
    : null

export const sendMail = async ({ to, subject, html }) => {
    if (!oauthTransport) {
        console.error('[Mailer] Gmail OAuth credentials are missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GOOGLE_USER.')
        return false
    }

    const mailOptions = {
        from: `"DocNest" <${gmailUser}>`,
        to,
        subject,
        html
    }

    try {
        await oauthTransport.verify()
        await oauthTransport.sendMail(mailOptions)
        console.log(`[Mailer] Email sent via OAuth to ${to}`)
        return true
    } catch (error) {
        console.error('[Mailer] Gmail OAuth send failed:', error.message)
        if (error.code === 'EAUTH' || /invalid_grant|oauth|authentication/i.test(error.message)) {
            console.error('[Mailer] Gmail OAuth credentials appear invalid or expired. Generate a fresh Google refresh token for the same Gmail account.')
        }
        return false
    }
}

export default oauthTransport || null