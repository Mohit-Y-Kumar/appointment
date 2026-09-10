import crypto from 'crypto'

/**
 * CSRF Protection 
 * 
 * Validates CSRF tokens for state-changing requests (POST, PUT, DELETE)
 * The token is stored in a non-httpOnly cookie and must be sent in the X-CSRF-Token header
 */

export const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * to generate and set CSRF token for GET requests
 * The token is set in a non-httpOnly cookie accessible to frontend
 */
export const csrfTokenGenerator = (req, res, next) => {
    const existingToken = req.cookies?.csrfToken
    const csrfToken = existingToken || generateCsrfToken()

    res.cookie('csrfToken', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000,
        path: '/'
    })

    req.csrfToken = csrfToken
    res.locals.csrfToken = csrfToken

    next()
}

/**
 * to validate CSRF tokens for state-changing requests
 * Skips GET and OPTIONS requests as they should not modify state
 */
export const csrfTokenValidator = (req, res, next) => {
    // Skip GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }

    // Skip socket.io, webhook endpoints, and public auth flows
    if (
        req.path.includes('socket') ||
        req.path.includes('webhook') ||
        req.path.includes('/login') ||
        req.path.includes('/register') ||
        req.path.includes('/refresh') ||
        req.path.includes('/logout')
    ) {
        return next()
    }

    const cookieHeader = req.headers.cookie || ''
    const hasAuthCookie = /(?:accessToken|doctorAccessToken|adminAccessToken|refreshToken)=/i.test(cookieHeader)

    // Unauthenticated requests should fail in the route/auth middleware with 401/200 instead of CSRF 403.
    if (!hasAuthCookie) {
        return next()
    }

    const tokenFromHeader = req.headers['x-csrf-token']
    const tokenFromCookie = req.cookies?.csrfToken

    if (!tokenFromHeader || !tokenFromCookie) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token validation failed'
        })
    }

    if (tokenFromHeader !== tokenFromCookie) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token validation failed'
        })
    }

    next()
}

export default { generateCsrfToken, csrfTokenGenerator, csrfTokenValidator }
