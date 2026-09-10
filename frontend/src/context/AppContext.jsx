import { createContext, useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from 'react-router-dom'
import { toast } from "react-toastify";
import axios from 'axios'
import { installAuthRefreshInterceptor, refreshSession } from '../utils/authRefresh.js'

axios.defaults.withCredentials = true
installAuthRefreshInterceptor()


export const AppContext = createContext()
const AppContextProvider = (props) => {
    const currencySymbol = '₹'
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const location = useLocation()

    const [doctors, setDoctors] = useState([])
    const [token, setToken] = useState(false)
    const [authReady, setAuthReady] = useState(false)
    const [userData, setUserData] = useState(false)
    const sessionCheckStarted = useRef(false)



    const getDoctorsData = useCallback(async () => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/doctor/list?limit=100`)
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }, [backendUrl])

    const loadUserProfileData = useCallback(async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/user/get-profile')
            if (data.success) {
                setUserData(data.userData)

            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }, [backendUrl])

    const value = {
        doctors, getDoctorsData,
        currencySymbol,
        token, setToken,
        authReady, setAuthReady,
        backendUrl,
        userData,setUserData,
        loadUserProfileData,
       
    }
    useEffect(() => {
        getDoctorsData()
    },[getDoctorsData])

    useEffect(() => {
        let isMounted = true
        if (location.pathname === '/verify-email' || location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
            sessionCheckStarted.current = true
            setAuthReady(true)
            return () => {
                isMounted = false
            }
        }

        if (sessionCheckStarted.current) return
        sessionCheckStarted.current = true

        setAuthReady(false)
        refreshSession(backendUrl, 'user')
            .then(() => {
                if (!isMounted) return
                setToken(true)
                setAuthReady(true)
            })
            .catch((error) => {
                if (!isMounted) return
                setAuthReady(true)

                if (error.response?.status !== 401) {
                    console.error('[AppContext] Refresh error:', error.response?.data?.message || error.message)
                }

                setToken(false)
            })

        return () => {
            isMounted = false
        }
    }, [backendUrl, location.pathname])

    useEffect(() => {
        if(token){
            loadUserProfileData()
        }else{
            setUserData(false)
        }

    },[token, loadUserProfileData])


    return (
        <AppContext.Provider value={value}>
            {props.children}

        </AppContext.Provider>
    )
}
export default AppContextProvider