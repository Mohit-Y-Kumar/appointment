import React, { useCallback, useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const slotDateFormat = (slotDate) => {
  const [d, m, y] = slotDate.split('_')
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`
}

const isRefundWindowOpen = (slotDate, slotTime) => {
  const dateMatch = /^(\d{1,2})_(\d{1,2})_(\d{4})$/.exec(slotDate || '')
  const timeMatch = /^(0?[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/.exec(slotTime || '')
  if (!dateMatch || !timeMatch) return false

  const [, day, month, year] = dateMatch.map(Number)
  const [, hourText, minuteText, meridiem] = timeMatch
  let hour = Number(hourText)
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0

  const appointmentDateTime = new Date(year, month - 1, day, hour, Number(minuteText))
  return appointmentDateTime.getTime() + 30 * 60 * 1000 >= Date.now()
}

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext)
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [refunds, setRefunds] = useState([])
  const [loadingId, setLoadingId] = useState(null)

  const getUserAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/appointments', {})
      if (data.success) {
        setAppointments(data.appointments)
      } else {
        toast.error(data.message)
      }

      const refundResponse = await axios.get(backendUrl + '/api/user/my-refunds?limit=100', {})
      if (refundResponse.data.success) setRefunds(refundResponse.data.refunds)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }, [backendUrl])

  const requestRefund = async (id) => {
    setLoadingId(id)
    try {
      const { data } = await axios.post(
        backendUrl + `/api/user/request-refund/${id}`,
        { reason: 'user_request' },
        {}
      )
      if (data.success) {
        toast.success(data.message)
        await getUserAppointments()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const cancelAppointment = async (id) => {
    setLoadingId(id)
    try {
      const { data } = await axios.post(
        backendUrl + '/api/user/cancel-appointment',
        { appointmentId: id },
        {}
      )
      if (data.success) {
        toast.success('Appointment cancelled successfully')
        getUserAppointments()
        getDoctorsData()
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const initPay = (order) => {
    if (!window.Razorpay) {
      toast.error('Payment system not loaded. Please refresh.')
      return
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Appointment Payment',
      description: 'Doctor Appointment',
      order_id: order.id,
      handler: async (response) => {
        try {
          const { data } = await axios.post(
            backendUrl + '/api/user/verifyRazorpay',
            { response },
            {}
          )
          if (data.success) {
            toast.success('Payment successful!')
            getUserAppointments()
          } else {
            toast.error('Payment verification failed')
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Payment verification error')
        }
      },
      modal: {
        ondismiss: () => toast.info('Payment cancelled')
      },
      theme: { color: '#6366f1' }
    }

    new window.Razorpay(options).open()
  }

  const appointmentRazorpay = async (id) => {
    setLoadingId(id)
    try {
      const { data } = await axios.post(
        backendUrl + '/api/user/payment-razorpay',
        { appointmentId: id },
        {}
      )
      if (data.success) {
        initPay(data.order)
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoadingId(null)
    }
  }

  useEffect(() => {
    if (token) getUserAppointments()
  }, [token, getUserAppointments])

  if (!appointments.length) {
    return (
      <div className='mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8'>
        <div className='mt-10 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)] sm:mt-12'>
          <p className='border-b border-slate-100 pb-3 text-base font-semibold text-slate-700 sm:text-lg'>
            My Appointments
          </p>
          <p className='mt-8 text-sm text-slate-400'>No appointments found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
      <div className='rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] sm:p-6'>
        <p className='border-b border-slate-100 pb-3 text-base font-semibold text-slate-700 sm:text-lg'>
          My Appointments
        </p>

        <div className='mt-4 space-y-4'>
          {appointments.map((item) => (
            <div
              key={item._id}
              className='flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:p-5'
            >
              <div className='shrink-0'>
                <img
                  className='h-24 w-24 rounded-2xl object-cover bg-indigo-50 sm:h-28 sm:w-28'
                  src={item.docData.image}
                  alt={item.docData.name}
                  loading='lazy'
                />
              </div>

              <div className='min-w-0 flex-1 text-sm text-slate-600'>
                <p className='truncate text-base font-semibold text-slate-800'>{item.docData.name}</p>
                <p className='text-slate-500'>{item.docData.speciality}</p>
                <p className='mt-3 text-sm font-medium text-slate-700'>Address:</p>
                <p className='text-xs text-slate-500'>{item.docData.address?.line1}</p>
                <p className='text-xs text-slate-500'>{item.docData.address?.line2}</p>
                <p className='mt-2 text-xs'>
                  <span className='text-sm font-medium text-slate-700'>Date &amp; Time: </span>
                  {slotDateFormat(item.slotDate)} &nbsp;|&nbsp; {item.slotTime}
                </p>
              </div>

              <div className='flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end sm:justify-end'>
                {item.cancelled && (
                  <span className='rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-500'>
                    Cancelled
                  </span>
                )}

                {!item.cancelled && !item.isCompleted && isRefundWindowOpen(item.slotDate, item.slotTime) && (
                  <>
                    {item.payment ? (
                      (() => {
                        const refund = refunds.find(entry => String(entry.appointmentId) === String(item._id))
                        return refund ? (
                          <span className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium capitalize text-amber-600'>
                            Refund {refund.status}
                          </span>
                        ) : (
                          <>
                            <span className='rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-600'>
                              Paid
                            </span>
                            <button
                              onClick={() => requestRefund(item._id)}
                              disabled={loadingId === item._id}
                              className='whitespace-nowrap rounded-xl border border-amber-300 px-4 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60'
                            >
                              {loadingId === item._id ? 'Requesting...' : 'Request Refund'}
                            </button>
                          </>
                        )
                      })()
                    ) : (
                      <button
                        onClick={() => appointmentRazorpay(item._id)}
                        disabled={loadingId === item._id}
                        className='whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {loadingId === item._id ? 'Processing...' : 'Pay Online'}
                      </button>
                    )}
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      disabled={loadingId === item._id}
                      className='whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-red-400 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      Cancel
                    </button>
                  </>
                )}

                {!item.cancelled && !item.isCompleted && !isRefundWindowOpen(item.slotDate, item.slotTime) && (
                  <span className='rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-500'>
                    Appointment ended
                  </span>
                )}

                {!item.cancelled && item.isCompleted && (
                  <>
                    <span className='rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-medium text-green-600'>
                      Completed
                    </span>
                    {item.payment && (
                      <button
                        onClick={() => navigate(`/appointment/${item.docId}`, {
                          state: { review: true, canReview: true, appointmentId: item._id }
                        })}
                        className='whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs font-medium text-white transition hover:opacity-90'
                      >
                        Give Review
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MyAppointments