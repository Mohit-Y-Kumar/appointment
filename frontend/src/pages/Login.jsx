import React, { useState, useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { getCsrfToken } from '../utils/csrfToken.js'
import { Link } from 'react-router-dom'

const Login = () => {
  const { backendUrl, token, setToken } = useContext(AppContext)
  const navigate = useNavigate()

  const [state, setState] = useState('Sign Up')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const resendVerification = async () => {
    if (loading || !registeredEmail) return
    setLoading(true)
    try {
      if (!getCsrfToken()) await axios.get(backendUrl + '/health', { withCredentials: true })
      const { data } = await axios.post(
        backendUrl + '/api/user/resend-verification',
        { email: registeredEmail },
        { withCredentials: true }
      )
      if (data.success) toast.success(data.message)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to resend verification email.')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      if (!getCsrfToken()) {
        await axios.get(backendUrl + '/health', { withCredentials: true })
      }

      if (state === 'Sign Up') {

        const { data } = await axios.post(
          backendUrl + '/api/user/register',
          { name, email, password },
          { withCredentials: true }
        )
        if (data.success) {
          toast.success('Account created! Please check your email to verify your account.')
          setRegisteredEmail(email)
          setShowVerificationMessage(true)
          // Clear form
          setName('')
          setEmail('')
          setPassword('')
        } else {
          toast.error(data.message)
        }
      } else {
        const { data } = await axios.post(
          backendUrl + '/api/user/login',
          { email, password },
          { withCredentials: true }
        )
        if (data.success) {
          setToken(true)
          toast.success('Welcome back! Logged in successfully ')
        } else {
          toast.error(data.message)
        }
      }
    } catch (err) {
      if (state === 'Sign Up' && err.response?.status === 503 && email) {
        setRegisteredEmail(email)
        setShowVerificationMessage(true)
      }
      toast.error(err.response?.data?.message || err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-[80vh] items-center justify-center px-4 py-12'>
      {showVerificationMessage ? (
        <div className='flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:p-8'>
          <div className='mb-2 flex justify-center'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-blue-100'>
              <svg className='h-8 w-8 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
              </svg>
            </div>
          </div>
          <h2 className='text-xl font-semibold text-slate-800 sm:text-2xl'>Verify Your Email</h2>
          <p className='text-sm text-slate-500'>We&apos;ve sent a verification link to:</p>
          <p className='break-all text-sm font-medium text-slate-800'>{registeredEmail}</p>
          <p className='text-xs leading-relaxed text-slate-600 sm:text-sm'>
            Please click the link in your email to verify your account. The link expires in 24 hours.
          </p>
          <div className='mt-2 rounded-2xl border border-blue-200 bg-blue-50 p-3'>
            <p className='text-xs text-blue-700'><strong>Tip:</strong> Check your spam folder if you don&apos;t see the email</p>
          </div>
          <button
            type='button'
            onClick={resendVerification}
            disabled={loading}
            className='cursor-pointer text-sm font-medium text-indigo-600 underline decoration-2 underline-offset-4 hover:text-indigo-800 disabled:opacity-60'
          >
            {loading ? 'Sending...' : 'Resend verification email'}
          </button>
          <button
            onClick={() => setShowVerificationMessage(false)}
            className='cursor-pointer text-sm font-medium text-indigo-600 underline decoration-2 underline-offset-4 hover:text-indigo-800'
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form
          onSubmit={onSubmitHandler}
          className='flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:p-8'
        >
          <div>
            <p className='text-xl font-semibold text-slate-800 sm:text-2xl'>
              {state === 'Sign Up' ? 'Create Account' : 'Login'}
            </p>
            <p className='mt-1 text-xs text-slate-500 sm:text-sm'>
              Please {state === 'Sign Up' ? 'sign up' : 'log in'} to book an appointment
            </p>
          </div>

          {state === 'Sign Up' && (
            <div className='w-full'>
              <label htmlFor='signup-name' className='mb-1 block text-xs font-medium text-slate-500'>Full Name</label>
              <input
                required
                id='signup-name'
                type='text'
                placeholder='John Doe'
                value={name}
                onChange={e => setName(e.target.value)}
                className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10'
              />
            </div>
          )}

          <div className='w-full'>
            <label htmlFor='login-email' className='mb-1 block text-xs font-medium text-slate-500'>Email</label>
            <input
              required
              id='login-email'
              type='email'
              placeholder='you@email.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
              className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10'
            />
          </div>

          <div className='w-full'>
            <label htmlFor='login-password' className='mb-1 block text-xs font-medium text-slate-500'>Password</label>
            <input
              required
              id='login-password'
              type='password'
              placeholder='•••••••••'
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-sky-500 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(59,130,246,0.26)] transition-all duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {loading && (
              <svg className='h-4 w-4 animate-spin text-white' viewBox='0 0 24 24' fill='none'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
              </svg>
            )}
            {state === 'Sign Up' ? 'Create Account' : 'Login'}
          </button>

          {state === 'Login' && (
            <Link to='/forgot-password' className='text-right text-xs font-medium text-indigo-600 underline decoration-2 underline-offset-4 hover:text-indigo-800'>Forgot password?</Link>
          )}

          <p className='text-center text-xs sm:text-sm'>
            {state === 'Sign Up' ? (
              <>Already have an account?{' '}
                <span onClick={() => setState('Login')} className='cursor-pointer text-indigo-600 underline decoration-2 underline-offset-4 hover:text-indigo-800'>
                  Login here
                </span>
              </>
            ) : (
              <>Don&apos;t have an account?{' '}
                <span onClick={() => setState('Sign Up')} className='cursor-pointer text-indigo-600 underline decoration-2 underline-offset-4 hover:text-indigo-800'>
                  Sign up
                </span>
              </>
            )}
          </p>
        </form>
      )}
    </div>
  )
}

export default Login