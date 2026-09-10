import React, { useContext, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { getCsrfToken } from '../utils/csrfToken.js'

const ForgotPassword = () => {
  const { backendUrl } = useContext(AppContext)
  const [email, setEmail] = useState('')
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

  return (
    <div className='min-h-[80vh] flex items-center justify-center px-4'>
      <div className='w-full max-w-sm bg-white border rounded-xl p-6 sm:p-8 shadow-lg text-zinc-600 text-sm'>
        {sent ? (
          <div className='text-center space-y-4'>
            <div className='text-4xl'>✉</div>
            <h1 className='text-xl sm:text-2xl font-semibold text-zinc-800'>Check your email</h1>
            <p>A password reset link has been sent if an account exists for this email.</p>
            <p className='text-xs text-zinc-500'>The link expires in 1 hour.</p>
            <Link to='/login' className='inline-block text-indigo-600 underline hover:text-indigo-800'>Back to Login</Link>
          </div>
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
