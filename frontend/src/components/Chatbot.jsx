import React, { useState, useRef, useEffect, useContext, useCallback } from 'react'
import axios from 'axios'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import VoiceChat from './VoiceChat'
import { assets } from '../assets/assets'
import { toast } from 'react-toastify'

const quickButtons = [
    { label: 'Fever', icon: assets.feverIcon, message: 'I have a fever. Which doctor should I consult?' },
    { label: 'Headache', icon: assets.headacheIcon, message: 'I have a headache. Which doctor should I consult?' },
    { label: 'Stomach Pain', icon: assets.stomachIcon, message: 'I have stomach pain. Which doctor should I consult?' },
    { label: 'Eyes', icon: assets.eyeiconIcon, message: 'I have an eye problem. Which doctor should I consult?' },
    { label: 'Child Care', icon: assets.childIcon, message: 'My child is sick. Which doctor should I consult?' },
    { label: 'Skin', icon: assets.skinIcon, message: 'I have a skin problem. Which doctor should I consult?' },
    { label: 'Book Appointment', icon: assets.appointiconIcon, message: 'I want to book an appointment.' },
]

const INITIAL_MESSAGE = {
    role: 'bot',
    text: "Hello \uD83D\uDC4B I'm your medical assistant. Please describe your symptoms or book an appointment."
}

const Chatbot = () => {
    const { backendUrl, token, doctors } = useContext(AppContext)
    const navigate = useNavigate()

    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([INITIAL_MESSAGE])
    const [convHistory, setConvHistory] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [suggestedDoctors, setSuggestedDoctors] = useState([])

    // Booking flow state management
    const [bookingStep, setBookingStep] = useState(null)   // null|'doctor'|'date'|'slot'|'confirm'
    const [selectedDoctor, setSelectedDoctor] = useState(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedSlot, setSelectedSlot] = useState('')
    const [availableSlots, setAvailableSlots] = useState([])

    const messagesEndRef = useRef(null)
    const speakFnRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, suggestedDoctors, bookingStep, loading])

    // Booking helpers
    const resetBooking = useCallback(() => {
        setBookingStep(null)
        setSelectedDoctor(null)
        setSelectedDate('')
        setSelectedSlot('')
        setAvailableSlots([])
    }, [])

    const generateSlots = (doctor, dateStr) => {
        if (!doctor || !dateStr) return []
        const [year, month, day] = dateStr.split('-')
        const slotDate = `${parseInt(day)}_${parseInt(month)}_${year}`
        const booked = doctor.slots_booked?.[slotDate] || []
        const allSlots = []

        for (let h = 10; h <= 20; h++) {
            ;['00', '30'].forEach(m => {
                const hour = h > 12 ? h - 12 : h
                const ampm = h >= 12 ? 'PM' : 'AM'
                const time = `${hour}:${m} ${ampm}`
                if (!booked.includes(time)) allSlots.push(time)
            })
        }
        return allSlots
    }

    // Handle appointment booking
    const bookAppointment = async () => {
        if (!token) {
            setMessages(prev => [...prev, { role: 'bot', text: 'You need to log in before booking an appointment.' }])
            resetBooking()
            return
        }
        if (!selectedDoctor || !selectedDate || !selectedSlot) {
            setMessages(prev => [...prev, { role: 'bot', text: 'Some required details are missing.' }])
            return
        }

        // Save locally before any state reset
        const doctorSnap = selectedDoctor
        const dateSnap = selectedDate
        const slotSnap = selectedSlot

        try {
            const [year, month, day] = dateSnap.split('-')
            const slotDate = `${parseInt(day)}_${parseInt(month)}_${year}`

            setLoading(true)
            setMessages(prev => [...prev, { role: 'bot', text: 'Creating your appointment...' }])

            const { data } = await axios.post(
                `${backendUrl}/api/user/book-appointment`,
                { docId: doctorSnap._id, slotDate, slotTime: slotSnap },
                { withCredentials: true }
            )

            if (data.success && data.appointmentId) {
                resetBooking()
                initiatePayment(data.appointmentId, doctorSnap, dateSnap, slotSnap)
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: 'Booking failed. Please try again.' }])
                resetBooking()
            }
        } catch (err) {
            console.error('[Chatbot] Booking error:', err)
            setMessages(prev => [...prev, { role: 'bot', text: 'An error occurred while booking. Please try again.' }])
            resetBooking()
        } finally {
            setLoading(false)
        }
    }

    // Razorpay payment
    const initiatePayment = async (appointmentId, doctor, date, slot) => {
        if (!appointmentId) return

        if (!window.Razorpay) {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'Payment system failed to load. Please refresh and try again.'
            }])
            return
        }

        try {
            setLoading(true)

            const { data } = await axios.post(
                `${backendUrl}/api/user/payment-razorpay`,
                { appointmentId },
                { withCredentials: true }
            )

            if (!data.success || !data.order) {
                setMessages(prev => [...prev, { role: 'bot', text: 'Could not create payment order. Please try again.' }])
                return
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'Appointment Payment',
                description: 'Doctor Appointment',
                order_id: data.order.id,

                handler: async (response) => {
                    try {
                        const verify = await axios.post(
                            `${backendUrl}/api/user/verifyRazorpay`,
                            { response },
                            { withCredentials: true }
                        )
                        if (verify.data.success) {
                            setMessages(prev => [...prev, {
                                role: 'bot',
                                type: 'payment_success',
                                data: {
                                    doctorName: doctor.name,
                                    bookingDate: date,
                                    bookingSlot: slot,
                                    bookingFees: doctor.fees
                                }
                            }])
                            setTimeout(() => navigate('/my-appointments'), 2500)
                        } else {
                            setMessages(prev => [...prev, { role: 'bot', text: 'Payment verification failed. Please contact support.' }])
                        }
                    } catch (err) {
                        console.error('[Chatbot] Verify error:', err)
                        setMessages(prev => [...prev, { role: 'bot', text: 'Payment verification failed.' }])
                    }
                },

                modal: {
                    ondismiss: () => {
                        setMessages(prev => [...prev, { role: 'bot', text: 'Payment was cancelled.' }])
                    }
                },
                theme: { color: '#6366f1' }
            }

            const rzp = new window.Razorpay(options)
            rzp.open()

        } catch (err) {
            console.error('[Chatbot] Payment error:', err)
            setMessages(prev => [...prev, { role: 'bot', text: 'An error occurred during payment. Please try again.' }])
        } finally {
            setLoading(false)
        }
    }

    // Send message to AI backend
    const sendMessage = useCallback(async (directMessage = null) => {
        const userMessage = (directMessage || input).trim()
        if (!userMessage || loading) return

        setMessages(prev => [...prev, { role: 'user', text: userMessage }])
        setInput('')
        setLoading(true)
        setSuggestedDoctors([])

        // Booking intent detection
        const lower = userMessage.toLowerCase()
        if (lower.includes('appointment') || lower.includes('book') || lower.includes('booking')) {
            if (token) {
                setBookingStep('doctor')
                setMessages(prev => [...prev, { role: 'bot', type: 'appointment_select' }])
            } else {
                setMessages(prev => [...prev, { role: 'bot', type: 'login_required' }])
            }
            setLoading(false)
            return
        }

        // AI chat
        if (!token) {
            setMessages(prev => [...prev, { role: 'bot', type: 'login_required' }])
            setLoading(false)
            return
        }
        const newHistory = [...convHistory, { role: 'user', content: userMessage }]

        try {
            const { data } = await axios.post(`${backendUrl}/api/chat/message`, {
                message: userMessage,
                conversationHistory: convHistory,
                doctors: doctors?.slice(0, 10),
            }, { withCredentials: true })

            if (data.success) {
                let reply = data.reply || ''
                let detectedSpeciality = null

                if (reply.includes('SPECIALITY:')) {
                    const parts = reply.split('SPECIALITY:')
                    reply = parts[0].trim()
                    detectedSpeciality = parts[1].trim()
                    const filtered = doctors?.filter(d => d.speciality === detectedSpeciality).slice(0, 3)
                    setSuggestedDoctors(filtered || [])
                }

                setConvHistory([...newHistory, { role: 'assistant', content: reply }])
                setMessages(prev => [...prev, { role: 'bot', text: reply }])

                // Speak the reply
                speakFnRef.current?.(reply, 'en')
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, something went wrong. Please try again.' }])
            }
        } catch (err) {
            const status = err?.response?.status
            const msg = err?.response?.data?.message || ''

            if (status === 429) {
                toast.error(` ${msg || 'Rate limit reached. Please wait and try again.'}`, {
                    autoClose: 6000
                })
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: msg || 'Rate limit reached. Please wait a moment and try again.'
                }])
            } else {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: 'Unable to connect to the server. Please try again later.'
                }])
            }
        } finally {
            setLoading(false)
        }
    }, [input, loading, token, convHistory, doctors, backendUrl])

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const renderMessage = (msg) => {
        switch (msg.type) {
            case 'payment_success': return <PaymentSuccessUI msg={msg} />
            case 'appointment_select': return <AppointmentSelectUI />
            case 'login_required': return <LoginRequiredUI />
            case 'slot_selected': return <SlotSelectedUI msg={msg} />
            default: return <span>{msg.text}</span>
        }
    }

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={() => setIsOpen(p => !p)}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
                className='fixed bottom-6 right-6 z-50 bg-linear-to-r from-primary to-accent text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300'
            >
                <img
                    src={isOpen ? assets.crossIcon : assets.chatIcon}
                    alt='chat'
                    className='w-6 h-6'
                />
            </button>

            {isOpen && (
                <div className='fixed bottom-20 left-3 right-3 z-50 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:left-auto sm:right-6 sm:w-96'>

                    {/* Header */}
                    <div className='bg-linear-to-r from-primary to-accent px-4 py-3 flex items-center gap-3 shrink-0'>
                        <div className='w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0'>
                            <img src={assets.robotIcon} alt='bot' className='w-5 h-5 object-contain' />
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-white font-semibold text-sm'>Medical Assistant</p>
                            <p className='text-blue-100 text-xs'>Online • How can I help you?</p>
                        </div>
                        <button
                            onClick={() => {
                                setMessages([INITIAL_MESSAGE])
                                setConvHistory([])
                                setSuggestedDoctors([])
                                resetBooking()
                            }}
                            className='text-blue-100 text-xs hover:text-white border border-blue-200 px-2 py-1 rounded-md hover:bg-blue-500/20 transition shrink-0'
                        >
                            Clear
                        </button>
                    </div>

                    {/* Messages */}
                    <div className='flex-1 overflow-y-auto p-4 space-y-3'>

                        {/* Quick buttons  */}
                        {messages.length === 1 && (
                            <div className='mb-3'>
                                <p className='text-xs text-gray-400 mb-2 text-center'>Choose a quick option to get started</p>
                                <div className='flex flex-wrap gap-2'>
                                    {quickButtons.map((btn, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(btn.message)}
                                            className='flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition'
                                        >
                                            <img src={btn.icon} alt={btn.label} className='w-4 h-4' />
                                            <span>{btn.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message list */}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line
                                    ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                    {renderMessage(msg)}
                                </div>
                            </div>
                        ))}

                        {/* Suggested doctors */}
                        {suggestedDoctors.length > 0 && (
                            <div className='bg-indigo-50 p-3 rounded-xl'>
                                <p className='text-xs text-gray-500 mb-2 flex items-center gap-1'>
                                    <img className='h-4 w-4' src={assets.docIcon} alt='' />
                                    Recommended Doctors
                                </p>
                                {suggestedDoctors.map((doc, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { navigate(`/appointment/${doc._id}`); setIsOpen(false) }}
                                        className='bg-white p-2 rounded-lg mb-2 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <img src={doc.image} alt={doc.name} className='w-10 h-10 rounded-full object-cover shrink-0' />
                                            <div className='flex-1 min-w-0'>
                                                <p className='text-sm font-medium text-gray-800 truncate'>{doc.name}</p>
                                                <p className='text-xs text-gray-500'>{doc.speciality}</p>
                                                <div className='flex items-center gap-1'>
                                                    <img className='h-3.5 w-3.5' src={assets.filledStar} alt='star' />
                                                    <span className='text-xs text-gray-500'>{doc.averageRating || '0.0'}</span>
                                                    <span className='text-xs text-gray-400 ml-1'>&#8377;{doc.fees}</span>
                                                </div>
                                            </div>
                                            <span className='text-xs bg-indigo-600 text-white px-2 py-1 rounded-full shrink-0'>Book</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/*  Booking steps  */}
                        {bookingStep === 'doctor' && (
                            <div className='bg-indigo-50 p-3 rounded-xl'>
                                <p className='text-xs text-gray-500 mb-2'>Please select a doctor</p>
                                <select
                                    onChange={e => {
                                        const doc = doctors?.find(d => d._id === e.target.value) || null
                                        setSelectedDoctor(doc)
                                    }}
                                    className='w-full border rounded-lg p-2 text-sm mb-2 bg-white'
                                    defaultValue=''
                                >
                                    <option value='' disabled>Choose a doctor</option>
                                    {doctors?.map(doc => (
                                        <option key={doc._id} value={doc._id}>
                                            {doc.name} — {doc.speciality} — &#8377;{doc.fees}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => {
                                        if (!selectedDoctor) return
                                        setBookingStep('date')
                                        setMessages(prev => [...prev, {
                                            role: 'bot',
                                            text: `${selectedDoctor.name} selected. Please choose a date.`
                                        }])
                                    }}
                                    disabled={!selectedDoctor}
                                    className='mx-auto flex items-center gap-1 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition'
                                >
                                    <span className='flex items-center gap-1'>
                                        Next
                                        <img src={assets.arrow_icon} alt="arrow" className='h-4 w-4' />
                                    </span>
                                </button>
                            </div>
                        )}

                        {bookingStep === 'date' && (
                            <div className='bg-indigo-50 p-3 rounded-xl'>
                                <p className='text-xs text-gray-500 mb-2'>Select a date</p>
                                <input
                                    type='date'
                                    min={new Date().toISOString().split('T')[0]}
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className='w-full border rounded-lg p-2 text-sm mb-2 bg-white'
                                />
                                <button
                                    onClick={() => {
                                        if (!selectedDate) return
                                        const slots = generateSlots(selectedDoctor, selectedDate)
                                        if (slots.length === 0) {
                                            setMessages(prev => [...prev, { role: 'bot', text: 'No slots available on this date. Please choose another date.' }])
                                            return
                                        }
                                        setAvailableSlots(slots)
                                        setBookingStep('slot')
                                        setMessages(prev => [...prev, {
                                            role: 'bot',
                                            text: `Date selected: ${selectedDate}. Please choose a time slot.`
                                        }])
                                    }}
                                    disabled={!selectedDate}

                                    className='mx-auto flex items-center gap-1 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition'
                                >
                                    <span className='flex items-center gap-1'>
                                        Next
                                        <img src={assets.arrow_icon} alt="arrow" className='h-4 w-4' />
                                    </span>
                                </button>
                            </div>
                        )}

                        {bookingStep === 'slot' && (
                            <div className='bg-indigo-50 p-3 rounded-xl'>
                                <p className='text-xs text-gray-500 mb-2'>Select a time slot</p>
                                <div className='flex flex-wrap gap-1 mb-2 max-h-32 overflow-y-auto'>
                                    {availableSlots.map((slot, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`text-xs px-3 py-1 rounded-full border transition
                                                ${selectedSlot === slot
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-gray-600 hover:bg-indigo-50 border-gray-200'}`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        if (!selectedSlot) return
                                        setBookingStep('confirm')
                                        setMessages(prev => [...prev, {
                                            role: 'bot',
                                            type: 'slot_selected',
                                            data: { selectedDoctor, selectedDate, selectedSlot }
                                        }])
                                    }}
                                    disabled={!selectedSlot}
                                    className='mx-auto flex items-center gap-1 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition'

                                >
                                    <span className='flex items-center gap-1'>
                                        Next
                                        <img src={assets.arrow_icon} alt="arrow" className='h-4 w-4' />
                                    </span>
                                </button>
                            </div>
                        )}

                        {bookingStep === 'confirm' && (
                            <div className='bg-indigo-50 p-3 rounded-xl'>
                                <p className='text-xs text-gray-500 mb-3'>Confirm your appointment details.</p>
                                <button
                                    onClick={bookAppointment}
                                    disabled={loading}
                                    className='w-full bg-linear-to-r from-primary to-accent text-white py-2 rounded-lg text-sm font-medium mb-2 disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition'
                                >
                                    {loading
                                        ? <><img src={assets.loadingIcon} className='w-4 h-4 animate-spin' alt='' /> Processing...</>
                                        : <>Book &amp; Pay &#8377;{selectedDoctor?.fees}</>
                                    }
                                </button>
                                <button
                                    onClick={() => {
                                        setMessages(prev => [...prev, { role: 'bot', text: 'Booking cancelled.' }])
                                        resetBooking()
                                    }}
                                    disabled={loading}
                                    className='w-full border text-gray-500 py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition'
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Typing indicator */}
                        {loading && (
                            <div className='flex justify-start'>
                                <div className='bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-none'>
                                    <div className='flex gap-1'>
                                        <span className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
                                        <span className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '150ms' }} />
                                        <span className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className='border-t p-3 flex gap-2 items-center shrink-0'>
                        <VoiceChat
                            onTranscript={({ text, lang }) => sendMessage(text, lang)}
                            onSpeak={fn => { speakFnRef.current = fn }}
                        />
                        <input
                            type='text'
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={bookingStep ? 'Booking in progress...' : 'Ask anything...'}
                            disabled={loading || bookingStep !== null}
                            className='flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-50 min-w-0'
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim() || bookingStep !== null}
                            className='bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition shrink-0'
                        >
                            <img className='h-5 w-5' src={assets.sendMsgIcon} alt='send' />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

//  display sub-components 
const SlotSelectedUI = ({ msg }) => {
    const { selectedDoctor, selectedDate, selectedSlot } = msg.data || {}
    return (
        <div className='space-y-2 text-sm'>
            <p className='font-semibold text-gray-800'>Please confirm your appointment details</p>
            <p className='flex items-center gap-2'>
                <img src={assets.docIcon} className='w-4 h-4 shrink-0' alt='' />
                {selectedDoctor?.name}
            </p>
            <p className='flex items-center gap-2'>
                <img src={assets.appointiconIcon} className='w-4 h-4 shrink-0' alt='' />
                {selectedDate}
            </p>
            <p className='flex items-center gap-2'>
                <img src={assets.clockIcon} className='w-4 h-4 shrink-0' alt='' />
                {selectedSlot}
            </p>
            <p className='flex items-center gap-2'>
                <img src={assets.earningIcon} className='w-4 h-4 shrink-0' alt='' />
                &#8377;{selectedDoctor?.fees}
            </p>
        </div>
    )
}

const PaymentSuccessUI = ({ msg }) => (
    <div className='space-y-2 text-sm'>
        <p className='font-semibold text-green-700'>Payment successful!</p>
        <p className='flex items-center gap-2'>
            <img src={assets.docIcon} className='w-4 h-4 shrink-0' alt='' />
            {msg.data.doctorName}
        </p>

        <p className='flex items-center gap-2'>
            <img src={assets.appointiconIcon} className='w-4 h-4 shrink-0' alt='' />
            {msg.data.bookingDate}
        </p>
        <p className='flex items-center gap-2'>
            <img src={assets.clockIcon} className='w-4 h-4 shrink-0' alt='' />
            {msg.data.bookingSlot}
        </p>
        <p className='flex items-center gap-2'>
            <img src={assets.earningIcon} className='w-4 h-4 shrink-0' alt='' />
            &#8377;{msg.data.bookingFees}
        </p>
        <p className='text-green-600 font-medium'>Appointment confirmed! Redirecting...</p>
    </div>
)

const AppointmentSelectUI = () => (
    <p className='flex items-center gap-2 text-gray-700 font-medium text-sm'>
        <img src={assets.appointiconIcon} className='w-4 h-4 shrink-0' alt='' />
        Select a doctor below to continue with your appointment.
    </p>
)

const LoginRequiredUI = () => (
    <p className='flex items-center gap-2 text-red-600 font-medium text-sm'>
        <img src={assets.appointiconIcon} className='w-4 h-4 shrink-0' alt='' />
        Please log in to book an appointment.
    </p>
)

export default Chatbot