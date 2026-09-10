import React, { useEffect, useState, useContext, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import { getCsrfToken } from '../utils/csrfToken.js'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { backendUrl, setToken } = useContext(AppContext)
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...')
  const [loading, setLoading] = useState(true)
  const verificationStarted = useRef(false)

  useEffect(() => {
    // Navigate to dashboard when redirect happens
    const timer = setTimeout(() => {
      if (status === 'success') navigate('/')
    }, 2000)
    return () => clearTimeout(timer)
  }, [status, navigate])

  useEffect(() => {
    const verifyEmail = async () => {
      if (verificationStarted.current) return
      verificationStarted.current = true

      try {
        const verificationToken = searchParams.get('token')
        const email = searchParams.get('email')

        if (!verificationToken || !email) {
          setStatus('error')
          setMessage('Invalid verification link. Missing token or email.')
          setLoading(false)
          return
        }

        if (!getCsrfToken()) {
          await axios.get(backendUrl + '/health', { withCredentials: true })
        }

        const { data } = await axios.post(
          backendUrl + '/api/user/verify-email',
          { token: verificationToken, email },
          { withCredentials: true }
        )

        if (data.success) {
          setStatus('success')
          setMessage('✓ Email verified successfully!')
          setToken(true)
          toast.success('Email verified! You are now logged in.')
        } else {
          setStatus('error')
          setMessage(data.message || 'Email verification failed.')
          toast.error(data.message)
        }
      } catch (error) {
        setStatus('error')
        const errorMsg = error.response?.data?.message || error.message || 'Email verification failed.'
        setMessage(errorMsg)
        toast.error(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams, backendUrl, setToken])

  return (
    <div className='min-h-[80vh] flex items-center justify-center px-4 bg-linear-to-br from-sky-50 to-teal-50'>
      <div className='w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 p-8'>
        
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold text-gray-800 mb-2'>Email Verification</h1>
          <p className='text-gray-500 text-sm'>Completing your registration</p>
        </div>

        <div className='space-y-6'>
          {loading && status === 'verifying' && (
            <>
              <div className='flex justify-center'>
                <div className='relative w-16 h-16'>
                  <div className='absolute inset-0 bg-linear-to-r from-primary to-accent rounded-full animate-spin'></div>
                  <div className='absolute inset-1 bg-white rounded-full flex items-center justify-center'>
                    <svg className='w-8 h-8 text-primary animate-pulse' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                  </div>
                </div>
              </div>
              <p className='text-center text-gray-600 font-medium'>{message}</p>
            </>
          )}

          {status === 'success' && !loading && (
            <>
              <div className='flex justify-center'>
                <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse'>
                  <svg className='w-8 h-8 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                  </svg>
                </div>
              </div>
              <div className='text-center'>
                <p className='text-green-600 font-semibold mb-2'>{message}</p>
                <p className='text-gray-500 text-sm'>Redirecting to dashboard...</p>
              </div>
            </>
          )}

          {status === 'error' && !loading && (
            <>
              <div className='flex justify-center'>
                <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center'>
                  <svg className='w-8 h-8 text-red-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                  </svg>
                </div>
              </div>
              <div className='text-center'>
                <p className='text-red-600 font-semibold mb-2'>{message}</p>
                <button
                  onClick={() => navigate('/login')}
                  className='w-full mt-4 bg-primary hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition'
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>

        <div className='mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-500'>
          <p>This verification link expires in 24 hours</p>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
