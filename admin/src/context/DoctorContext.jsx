import axios from 'axios'
import React, { createContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { getCsrfToken } from '../utils/csrfToken.js'
import { clearActiveRole, getActiveRole, refreshSession } from '../utils/authRefresh.js'

axios.defaults.withCredentials = true

const ensureCsrfToken = async () => {
  const token = getCsrfToken()
  if (token) return token

  try {
    await axios.get(`${import.meta.env.VITE_BACKEND_URL}/health`, { withCredentials: true })
  } catch (err) {
    console.debug('[DoctorContext] CSRF cookie bootstrap failed; continuing', err)
  }

  return getCsrfToken()
}

export const DoctorContext = createContext()

const DoctorContextProvider = (props) => {

  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const [dToken, setDToken]       = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [appointmentPagination, setAppointmentPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 })
  const [dashData, setDashData]   = useState(false)
  const [profileData, setProfileData] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (getActiveRole() !== 'doctor') {
      setAuthReady(true)
      return () => {
        isMounted = false
      }
    }
    setAuthReady(false)
    refreshSession(backendUrl, 'doctor')
      .then(() => {
        if (!isMounted) return
        setDToken(true)
        setAuthReady(true)
      })
      .catch((error) => {
        if (!isMounted) return
        setAuthReady(true)
        
        // Log refresh errors for debugging
        if (error.response?.status === 401) {
          console.warn('[DoctorContext] Refresh token validation failed (401). This may indicate stale cookies. Clear browser cookies if login issues persist.')
          console.error('[DoctorContext] Refresh error:', error.response?.data?.message)
        }
        
        clearActiveRole()
        setDToken(false)
      })

    return () => {
      isMounted = false
    }
  }, [backendUrl])

  // Auth header 
  const authHeader = () => ({ withCredentials: true })

  //  get all appointments 
  const getAppointments = async (page = 1) => {
    try {
      if (!dToken) return
      const { data } = await axios.get(
        backendUrl + `/api/doctor/appointments?page=${page}&limit=10`,
        authHeader()
      )
      if (data.success) {
        setAppointments(data.appointments?.slice().reverse())
        setAppointmentPagination(data.pagination || { page, pages: 1, total: data.appointments.length, limit: 10 })
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  //  complete appointment 
  const completeAppointment = async (appointmentId) => {
    try {
      await ensureCsrfToken()
      const { data } = await axios.post(
        backendUrl + '/api/doctor/complete-appointment',
        { appointmentId },
        authHeader()
      )
      if (data.success) {
        toast.success(data.message)
        await getAppointments()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  //  cancel appointment 
  const cancelAppointment = async (appointmentId) => {
    try {
      await ensureCsrfToken()
      const { data } = await axios.post(
        backendUrl + '/api/doctor/cancel-appointment',
        { appointmentId },
        authHeader()
      )
      if (data.success) {
        toast.success(data.message)
        await getAppointments()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  //  get dashboard summary ──────────────────────────────────────
  const getDashData = async () => {
    try {
      if (!dToken) return
      const { data } = await axios.get(
        backendUrl + '/api/doctor/dashboard',
        authHeader()
      )
      if (data.success) {
        setDashData(data.dashData)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  //  get profile 
  const getProfileData = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + '/api/doctor/profile',
        authHeader()
      )
      if (data.success) {
        setProfileData(data.profileData)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const getDoctorRatings = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + '/api/doctor/ratings',
        authHeader()
      )
      if (data.success) return data.ratings
      toast.error(data.message)
      return null
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return null
    }
  }

  const getVisitStats = async (period = 'daily') => {
    try {
      const { data } = await axios.get(
        backendUrl + `/api/doctor/visit-stats?period=${period}`,
        authHeader()
      )
      if (data.success) return data.visitStats
      toast.error(data.message)
      return []
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return []
    }
  }

  const getRevenueData = async (period = 'monthly') => {
    try {
      const { data } = await axios.get(
        backendUrl + `/api/doctor/revenue?period=${period}`,
        authHeader()
      )
      if (data.success) return data.revenueData
      toast.error(data.message)
      return []
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return []
    }
  }

  const getUpcomingToday = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + '/api/doctor/upcoming-today',
        authHeader()
      )
      if (data.success) return data.upcoming
      toast.error(data.message)
      return []
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return []
    }
  }

  const value = {
    dToken, setDToken,
    authReady,
    backendUrl,
    appointments, setAppointments, appointmentPagination,
    dashData, setDashData,
    profileData, setProfileData,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    getDashData,
    getProfileData,
    // new
    getDoctorRatings,
    getVisitStats,
    getRevenueData,
    getUpcomingToday,
  }

  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  )
}

export default DoctorContextProvider