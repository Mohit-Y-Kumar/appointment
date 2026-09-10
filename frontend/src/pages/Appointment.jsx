import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import { toast } from 'react-toastify'
import axios from 'axios'
import Review from '../components/Review'
import ChatWindow from '../components/ChatWindow'

const DAY_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const Appointment = () => {
  const { docId } = useParams()
  const { doctors, currencySymbol, backendUrl, token, getDoctorsData, userData } = useContext(AppContext)
  const navigate = useNavigate()
  const location = useLocation()

  const isReviewMode = location.state?.review
  const canReview = location.state?.canReview
  const appointmentId = location.state?.appointmentId

  const [docInfo, setDocInfo] = useState(null)
  const [docSlots, setDocSlots] = useState([])
  const [slotIndex, setSlotIndex] = useState(0)
  const [slotTime, setSlotTime] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [booking, setBooking] = useState(false)
  const [doctorReviews, setDoctorReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState(null)

  const fetchDoctorReviews = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/reviews/doctor/${docId}`)
      if (data.success) {
        setDoctorReviews(data.reviews)
        setReviewSummary(data.summary)
      }
    } catch (err) {
      console.error('[Appointment] fetchDoctorReviews:', err.message)
    }
  }

  useEffect(() => {
    if (doctors.length > 0) {
      const found = doctors.find(d => d._id?.toString() === docId)
      setDocInfo(found || null)
    }
  }, [doctors, docId])

  useEffect(() => {
    if (!docInfo) return
    const today = new Date()
    const slots = []

    for (let i = 0; i < 7; i++) {

      if (
        i === 0 &&
        (today.getHours() > 20 || (today.getHours() === 20 && today.getMinutes() >= 30))
      ) {
        continue;
      }

      const curr = new Date(today)
      curr.setDate(today.getDate() + i)

      const end = new Date(today)
      end.setDate(today.getDate() + i)
      end.setHours(21, 0, 0, 0)

      if (i === 0) {
        curr.setHours(curr.getHours() > 10 ? curr.getHours() + 1 : 10)
        curr.setMinutes(curr.getMinutes() > 30 ? 30 : 0)
      } else {
        curr.setHours(10, 0, 0, 0)
      }

      const daySlots = []
      while (curr < end) {
        const time = curr.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const d = curr.getDate()
        const m = curr.getMonth() + 1
        const y = curr.getFullYear()
        const slotDate = `${d}_${m}_${y}`
        const available = !(docInfo?.slots_booked?.[slotDate]?.includes(time))
        if (available) daySlots.push({ datetime: new Date(curr), time })
        curr.setMinutes(curr.getMinutes() + 30)
      }
      slots.push(daySlots)
    }
    setDocSlots(slots)
    setSlotIndex(0)
    setSlotTime('')
  }, [docInfo])

  useEffect(() => { fetchDoctorReviews() }, [docId])

  const bookAppointment = async () => {
    if (!token) { toast.warn('Login to book appointment'); return navigate('/login') }
    if (!slotTime) { toast.error('Please select a time slot'); return }
    if (booking) return

    if (!userData?.gender || userData.gender === 'Not Selected') {
      toast.error('Please update your gender in profile before booking.')
      return navigate('/my-profile')
    }

    if (!userData?.dob || userData.dob === 'Not Selected') {
      toast.error('Please update your date of birth in profile before booking.')
      return navigate('/my-profile')
    }
    
    setBooking(true)
    try {
      const date = docSlots[slotIndex][0].datetime
      const slotDate = `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`

      const { data } = await axios.post(
        `${backendUrl}/api/user/book-appointment`,
        { docId, slotDate, slotTime },
        { withCredentials: true }
      )
      if (data.success) {
        toast.success(data.message)
        getDoctorsData()
        navigate('/my-appointments')
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setBooking(false)
    }
  }

  if (!docInfo) return (
    <div className='flex min-h-[60vh] items-center justify-center'>
      <p className='text-sm text-slate-400'>Loading doctor information...</p>
    </div>
  )

  return (
    <div className='mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8'>
      <div className='mt-4 flex flex-col gap-4 sm:flex-row'>
        <div className='shrink-0'>
          <img
            className='w-full rounded-[28px] border border-sky-100 bg-gradient-to-br from-primary via-sky-600 to-accent p-1 object-cover shadow-[0_20px_45px_rgba(59,130,246,0.18)] sm:max-w-64 md:max-w-72'
            src={docInfo.image}
            alt={docInfo.name}
            loading='lazy'
          />
        </div>

        <div className='flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] sm:p-8'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-xl font-medium text-slate-900 sm:text-2xl'>{docInfo.name}</p>
            <img className='h-5 w-5' src={assets.verified_icon} alt='verified' />
          </div>

          <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600'>
            <p>{docInfo.degree} &mdash; {docInfo.speciality}</p>
            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600'>
              {docInfo.experience}
            </span>
          </div>

          <div className='mt-4'>
            <p className='flex items-center gap-1 text-sm font-medium text-slate-900'>
              About <img src={assets.info_icon} alt='' className='h-4 w-4' />
            </p>
            <p className='mt-1 max-w-2xl text-sm leading-6 text-slate-500'>{docInfo.about}</p>
          </div>

          <p className='mt-4 text-sm font-medium text-slate-500'>
            Appointment fee:{' '}
            <span className='font-semibold text-slate-800'>
              {currencySymbol}{docInfo.fees}
            </span>
          </p>

          <button
            onClick={() => token ? setShowChat(true) : navigate('/login')}
            className={`mt-5 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all duration-200 ${token
              ? 'bg-gradient-to-r from-primary to-accent text-white shadow-[0_12px_30px_rgba(59,130,246,0.22)] hover:opacity-95'
              : 'border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
            }`}
          >
            <img src={assets.chatIcon} className='h-4 w-4' alt="" />
            {token ? 'Chat with Doctor' : 'Login to Chat'}
          </button>
        </div>
      </div>

      <div className='mt-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-6'>
        <p className='mb-4 font-medium text-slate-700'>Booking slots</p>

        <div className='hide-scrollbar flex gap-3 overflow-x-auto pb-2'>
          {docSlots.map((daySlots, i) => (
            <button
              key={i}
              onClick={() => { setSlotIndex(i); setSlotTime('') }}
              className={`min-w-[72px] shrink-0 rounded-full px-3 py-4 text-center text-sm transition ${slotIndex === i
                ? 'bg-gradient-to-r from-primary to-sky-500 text-white shadow-[0_12px_25px_rgba(59,130,246,0.24)]'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              <p className='font-medium'>{daySlots[0] ? DAY_OF_WEEK[daySlots[0].datetime.getDay()] : '—'}</p>
              <p className='text-lg font-semibold'>{daySlots[0]?.datetime.getDate()}</p>
            </button>
          ))}
        </div>

        <div className='mt-4 flex flex-wrap gap-2'>
          {docSlots[slotIndex]?.length > 0 ? (
            docSlots[slotIndex].map((item, i) => (
              <button
                key={i}
                onClick={() => setSlotTime(item.time)}
                className={`rounded-full border px-4 py-2 text-sm transition ${item.time === slotTime
                  ? 'border-primary bg-primary text-white shadow-[0_12px_25px_rgba(59,130,246,0.22)]'
                  : 'border-slate-300 text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'}`}
              >
                {item.time.toLowerCase()}
              </button>
            ))
          ) : (
            <p className='mt-2 text-sm text-slate-400'>No slots available for this day.</p>
          )}
        </div>

        <button
          onClick={bookAppointment}
          disabled={!slotTime || booking}
          className='mt-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-sky-500 px-10 py-3 text-sm font-medium text-white shadow-[0_12px_30px_rgba(59,130,246,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-14'
        >
          {booking && (
            <svg className='h-4 w-4 animate-spin text-white' viewBox='0 0 24 24' fill='none'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
            </svg>
          )}
          {booking ? 'Booking...' : 'Book an Appointment'}
        </button>
      </div>

      <div className='mt-10'>
        {isReviewMode && canReview && (
          <Review
            canReview
            appointmentId={appointmentId}
            doctorId={docId}
            onReviewSubmit={fetchDoctorReviews}
          />
        )}
        <Review
          readOnly
          reviewData={doctorReviews}
          summary={reviewSummary}
          onReviewSubmit={fetchDoctorReviews}
        />
      </div>

      <RelatedDoctors docId={docId} speciality={docInfo.speciality} />

      {showChat && userData && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4'>
          <div className='w-full max-w-md'>
            <ChatWindow
              appointmentId={`chat_${docId}_${userData._id}`}
              doctorId={docId}
              doctorName={docInfo.name}
              doctorImage={docInfo.image}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Appointment