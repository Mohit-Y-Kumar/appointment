import React, { useContext, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import { getCsrfToken } from '../utils/csrfToken.js'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  const submit = async event => {
    event.preventDefault()
    if (loading) return
    if (password !== confirmPassword) return toast.error('Passwords do not match.')
    setLoading(true)
    try {
      if (!getCsrfToken()) await axios.get(backendUrl + '/health', { withCredentials: true })
      const payload = {
        email,
        password,
        token: searchParams.get('token'),
        otp: searchParams.get('token') ? undefined : otp
      }
      const { data } = await axios.post(backendUrl + '/api/user/reset-password', payload, { withCredentials: true })
      if (!data.success) return toast.error(data.message)
      setCompleted(true)
      toast.success(data.message)
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tokenExists = Boolean(searchParams.get('token') && searchParams.get('email'))

  if (tokenExists) {
    return (
      <div className='min-h-[80vh] flex items-center justify-center px-4'>
        <form onSubmit={submit} className='flex flex-col gap-4 w-full max-w-sm bg-white border rounded-xl p-6 sm:p-8 shadow-lg text-zinc-600 text-sm'>
          <div>
            <h1 className='text-xl sm:text-2xl font-semibold text-zinc-800'>{completed ? 'Password Updated' : 'Reset Password'}</h1>
            {!completed && <p className='text-xs sm:text-sm mt-1 text-zinc-500'>Choose a new password for your account.</p>}
          </div>
          {!completed && <>
            <div>
              <label htmlFor='new-password' className='block mb-1 text-xs font-medium text-zinc-500'>New Password</label>
              <input id='new-password' required minLength={8} type='password' value={password} onChange={event => setPassword(event.target.value)} placeholder='At least 8 characters' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
            </div>
            <div>
              <label htmlFor='confirm-password' className='block mb-1 text-xs font-medium text-zinc-500'>Confirm Password</label>
              <input id='confirm-password' required minLength={8} type='password' value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder='Repeat your password' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
            </div>
            <button type='submit' disabled={loading} className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg w-full py-2.5 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed'>{loading ? 'Updating...' : 'Reset Password'}</button>
          </>}
          {completed && <p className='text-center text-zinc-500'>Redirecting to login...</p>}
        </form>
      </div>
    )
  }

  return (
    <div className='min-h-[80vh] flex items-center justify-center px-4'>
      <form onSubmit={submit} className='flex flex-col gap-4 w-full max-w-sm bg-white border rounded-xl p-6 sm:p-8 shadow-lg text-zinc-600 text-sm'>
        <div>
          <h1 className='text-xl sm:text-2xl font-semibold text-zinc-800'>{completed ? 'Password Updated' : 'Reset Password'}</h1>
          {!completed && <p className='text-xs sm:text-sm mt-1 text-zinc-500'>Enter your email and the 6-digit code from the reset email.</p>}
        </div>
        {!completed && <>
          <div>
            <label htmlFor='reset-email' className='block mb-1 text-xs font-medium text-zinc-500'>Email</label>
            <input id='reset-email' required type='email' value={email} onChange={event => setEmail(event.target.value)} placeholder='you@email.com' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
          </div>
          <div>
            <label htmlFor='reset-otp' className='block mb-1 text-xs font-medium text-zinc-500'>Verification Code</label>
            <input id='reset-otp' required type='text' value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder='123456' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm tracking-[0.35em] text-center text-lg font-semibold' />
          </div>
          <div>
            <label htmlFor='new-password' className='block mb-1 text-xs font-medium text-zinc-500'>New Password</label>
            <input id='new-password' required minLength={8} type='password' value={password} onChange={event => setPassword(event.target.value)} placeholder='At least 8 characters' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
          </div>
          <div>
            <label htmlFor='confirm-password' className='block mb-1 text-xs font-medium text-zinc-500'>Confirm Password</label>
            <input id='confirm-password' required minLength={8} type='password' value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder='Repeat your password' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
          </div>
          <button type='submit' disabled={loading} className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg w-full py-2.5 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed'>{loading ? 'Updating...' : 'Reset Password'}</button>
        </>}
        {completed && <p className='text-center text-zinc-500'>Redirecting to login...</p>}
      </form>
    </div>
  )
}

export default ResetPassword
