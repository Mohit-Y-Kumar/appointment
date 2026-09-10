import axios from 'axios'

const refreshPromises = new Map()

export const refreshSession = (backendUrl, role) => {
    if (!refreshPromises.has(role)) {
        const promise = axios.post(`${backendUrl}/api/${role}/refresh`, {}, { withCredentials: true })
            .finally(() => refreshPromises.delete(role))
        refreshPromises.set(role, promise)
    }

    return refreshPromises.get(role)
}

const roleFromRequest = url => {
    const match = url?.match(/\/api\/(user|doctor|admin)(?:\/|$)/)
    return match?.[1]
}

export const installAuthRefreshInterceptor = () => {
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
            await refreshSession(import.meta.env.VITE_BACKEND_URL, role)
            return axios(request)
        } catch {
            return Promise.reject(error)
        }
    })
}