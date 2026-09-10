import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { clearActiveRole } from '../utils/authRefresh.js'
import BrandMark from './BrandMark'

const Navbar = () => {
  const { aToken, setAToken, backendUrl } = useContext(AdminContext)
  const { dToken, setDToken } = useContext(DoctorContext)
  const navigate = useNavigate()

  const logout = async () => {
    try {
      navigate('/')
      if (aToken) {
        setAToken(false)
        await axios.post(`${backendUrl}/api/admin/logout`, {}, { withCredentials: true })
      }
      if (dToken) {
        setDToken(false)
        await axios.post(`${backendUrl}/api/doctor/logout`, {}, { withCredentials: true })
      }
      clearActiveRole()
      toast.success('Logged out successfully.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Logout failed. Please try again.')
    }
  }

  return (
    <header className='fixed left-0 right-0 top-0 z-50 border-b border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-6'>
      <div className='flex items-center justify-between gap-3'>
        {/* Left — Brand */}
        <div className='flex items-center gap-3'>
          <BrandMark compact />
          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]
            ${aToken
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : 'border-pink-200 bg-pink-50 text-pink-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${aToken ? 'bg-indigo-600' : 'bg-pink-600'}`} />
            {aToken ? 'Admin' : 'Doctor'}
          </span>
        </div>

        {/* Right — Logout */}
        <button
          onClick={logout}
          className='inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800'
        >
          <svg width='14' height='14' viewBox='0 0 20 20' fill='none' stroke='white' strokeWidth='2' strokeLinecap='round'>
            <path d='M13 15l5-5-5-5M18 10H7M10 3H4a1 1 0 00-1 1v12a1 1 0 001 1h6'/>
          </svg>
          Logout
        </button>
      </div>
    </header>
  )
}

export default Navbar