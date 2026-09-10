import axios from 'axios'

const refreshPromises = new Map()
const activeRoleCookie = 'docnestRole'

export const getActiveRole = () => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${activeRoleCookie}=`)
    return parts.length === 2 ? parts.pop().split(';').shift() : null
}

export const setActiveRole = role => {
    document.cookie = `${activeRoleCookie}=${role}; Path=/; SameSite=Lax`
}

export const clearActiveRole = () => {
    document.cookie = `${activeRoleCookie}=; Max-Age=0; Path=/; SameSite=Lax`
}

export const refreshSession = (backendUrl, role) => {
    if (!refreshPromises.has(role)) {
        const promise = axios.post(`${backendUrl}/api/${role}/refresh`, {}, { withCredentials: true })
            .finally(() => refreshPromises.delete(role))
        refreshPromises.set(role, promise)
    }

    return refreshPromises.get(role)
}

const roleFromRequest = url => {
    const match = url?.match(/\/api\/(admin|doctor)(?:\/|$)/)
    return match?.[1]
}

export const installAuthRefreshInterceptor = backendUrl => {
    if (axios.__docNestRefreshInterceptor) return
    axios.__docNestRefreshInterceptor = true

    axios.interceptors.response.use(undefined, async error => {
        const request = error.config
        const role = roleFromRequest(request?.url)
        if (error.response?.status !== 401 || !request || request._retry || !role || request.url?.includes('/refresh')) {
            return Promise.reject(error)
        }

        request._retry = true
        try {
            await refreshSession(backendUrl, role)
            return axios(request)
        } catch {
            return Promise.reject(error)
        }
    })
}