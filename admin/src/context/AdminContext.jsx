import { createContext, useEffect, useState } from "react";
import axios from 'axios'
import { toast } from 'react-toastify';
import { getCsrfToken } from '../utils/csrfToken.js'
import { clearActiveRole, getActiveRole, installAuthRefreshInterceptor, refreshSession } from '../utils/authRefresh.js'

axios.defaults.withCredentials = true
installAuthRefreshInterceptor(import.meta.env.VITE_BACKEND_URL)

const ensureCsrfToken = async () => {
    const token = getCsrfToken()
    if (token) return token

    try {
        await axios.get(`${import.meta.env.VITE_BACKEND_URL}/health`, { withCredentials: true })
    } catch {
        // no-op: backend health endpoint is safe and used to establish the cookie state
    }

    return getCsrfToken()
}


export const AdminContext = createContext()

const AdminContextProvider = (props) => {

    const [aToken, setAToken] = useState(false)
    const [authReady, setAuthReady] = useState(false)
    const [doctors, setDoctors] = useState([])
    const [appointments, setAppointments] = useState([])
    const [appointmentPagination, setAppointmentPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 })
    const [dashData, setDashData] = useState(false)

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        let isMounted = true
        if (getActiveRole() !== 'admin') {
            setAuthReady(true)
            return () => {
                isMounted = false
            }
        }
        setAuthReady(false)
        refreshSession(backendUrl, 'admin')
            .then(() => {
                if (!isMounted) return
                setAToken(true)
                setAuthReady(true)
            })
            .catch((error) => {
                if (!isMounted) return
                setAuthReady(true)
                
                // Log refresh errors for debugging
                if (error.response?.status === 401) {
                    console.warn('[AdminContext] Refresh token validation failed (401). This may indicate stale cookies. Clear browser cookies if login issues persist.')
                    console.error('[AdminContext] Refresh error:', error.response?.data?.message)
                }
                
                clearActiveRole()
                setAToken(false)
            })

        return () => {
            isMounted = false
        }
    }, [backendUrl])

    const getAllDoctors = async () => {

        try {
            await ensureCsrfToken()
            const { data } = await axios.post(`${backendUrl}/api/admin/all-doctors?limit=100`, {}, { withCredentials: true })
            if (data.success) {
                setDoctors(data.doctors)
                console.log(data.doctors)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }


    }

    const changeAvailability = async (docId) => {
        try {
            await ensureCsrfToken()
            const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, { withCredentials: true })
            if (data.success) {
                toast.success(data.message)
                getAllDoctors()
            } else {
                toast.error(data.message)
            }



        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    const getAllAppointments = async (page = 1) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/appointments?page=${page}&limit=10`, { withCredentials: true })

            if (data.success) {
                setAppointments(data.appointments)
                setAppointmentPagination(data.pagination || { page, pages: 1, total: data.appointments.length, limit: 10 })
            } else {
                toast.error(data.message)
            }


        } catch (error) {
            toast.error(error.message)
        }
    }

    const cancelAppointment = async (appointmentId) => {
        try {
            await ensureCsrfToken()
            const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { withCredentials: true })
            if (data.success) {
                toast.success(data.message)
                getAllAppointments();
            } else {
                  toast.error(data.message)
            }


        }
        catch (error) {
            toast.error(error.response?.data?.message || error.message)

        }
    }

    const getDashData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/dashboard',  { withCredentials: true })
            if (data.success) {
                setDashData(data.dashData)
                console.log(data.dashData)
            } 


        }
        catch (error) {
            toast.error(error.message)

        }

    }

    const value = {
        aToken,
        setAToken,
        authReady,
        backendUrl,
        doctors,
        getAllDoctors,
        changeAvailability,
        appointments, setAppointments, appointmentPagination,
        getAllAppointments, cancelAppointment,dashData,getDashData

    }
    return (
        <AdminContext.Provider value={value}>
            {props.children}

        </AdminContext.Provider>
    )
}

export default AdminContextProvider