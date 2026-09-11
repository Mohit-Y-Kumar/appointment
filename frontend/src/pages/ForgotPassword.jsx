import React, { useContext, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { getCsrfToken } from '../utils/csrfToken.js'

const ForgotPassword = () => {
  const { backendUrl } = useContext(AppContext)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async event => {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      if (!getCsrfToken()) await axios.get(backendUrl + '/health', { withCredentials: true })
      const { data } = await axios.post(backendUrl + '/api/user/forgot-password', { email }, { withCredentials: true })
      if (!data.success) return toast.error(data.message)
      setSent(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetWithOtp = async (event) => {
    event.preventDefault()
    if (loading || !email || !otp || !password || !confirmPassword) return
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      if (!getCsrfToken()) await axios.get(backendUrl + '/health', { withCredentials: true })
      const { data } = await axios.post(
        backendUrl + '/api/user/reset-password',
        { email, otp, password },
        { withCredentials: true }
      )
      if (!data.success) return toast.error(data.message)
      toast.success(data.message)
      setSent(false)
      setEmail('')
      setOtp('')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-[80vh] flex items-center justify-center px-4'>
      <div className='w-full max-w-sm bg-white border rounded-xl p-6 sm:p-8 shadow-lg text-zinc-600 text-sm'>
        {sent ? (
          <form onSubmit={resetWithOtp} className='flex flex-col gap-4 text-left'>
            <div className='text-center'>
              <div className='text-4xl'>✉</div>
              <h1 className='text-xl sm:text-2xl font-semibold text-zinc-800'>Check your email</h1>
              <p className='mt-2 text-sm text-zinc-600'>Use the 6-digit code or the reset link sent to your email.</p>
            </div>

            <div>
              <label htmlFor='reset-email' className='block mb-1 text-xs font-medium text-zinc-500'>Email</label>
              <input id='reset-email' required type='email' value={email} onChange={event => setEmail(event.target.value)} className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
            </div>

            <div>
              <label htmlFor='reset-otp' className='block mb-1 text-xs font-medium text-zinc-500'>Verification code</label>
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

            <button type='submit' disabled={loading} className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg w-full py-2.5 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed'>
              {loading ? 'Updating...' : 'Reset Password'}
            </button>

            <Link to='/login' className='text-center text-indigo-600 underline hover:text-indigo-800'>Back to Login</Link>
          </form>
        ) : (
          <form onSubmit={submit} className='flex flex-col gap-4'>
            <div>
              <h1 className='text-xl sm:text-2xl font-semibold text-zinc-800'>Forgot Password?</h1>
              <p className='text-xs sm:text-sm mt-1 text-zinc-500'>Enter your email to receive a password reset link.</p>
            </div>
            <div>
              <label htmlFor='reset-email' className='block mb-1 text-xs font-medium text-zinc-500'>Email</label>
              <input id='reset-email' required type='email' value={email} onChange={event => setEmail(event.target.value)} placeholder='you@email.com' className='border border-zinc-300 rounded-lg w-full px-3 py-2 focus:outline-none focus:border-indigo-400 transition text-sm' />
            </div>
            <button type='submit' disabled={loading} className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg w-full py-2.5 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed'>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <Link to='/login' className='text-center text-indigo-600 underline hover:text-indigo-800'>Back to Login</Link>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
