import React, { useState, useEffect, useRef, useContext } from 'react'
import { io } from 'socket.io-client'
import { DoctorContext } from '../../context/DoctorContext'
import axios from 'axios'
import DoctorVideoCall from './DoctorVideoCall'
import { assets } from '../../assets/assets'
import { toast } from 'react-toastify'


const DoctorChat = ({ docId, patientId, patientName, patientImage, onClose }) => {
    const { backendUrl, profileData } = useContext(DoctorContext)

    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [connected, setConnected] = useState(false)
    const [showVideoCall, setShowVideoCall] = useState(false)
    const [incomingCallData, setIncomingCallData] = useState(null)
    const [isCalling, setIsCalling] = useState(false)
    const [callType, setCallType] = useState('audio')
    const [selectedImage, setSelectedImage] = useState(null)

    const socketRef = useRef(null)
    const messagesEndRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    const roomId = `chat_${docId}_${patientId}`
    const callRoomId = `call_${docId}_${patientId}`

    useEffect(() => {
        socketRef.current = io(backendUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
        })

        socketRef.current.on('connect', () => {
            setConnected(true)
            //  join  Chat room 
            socketRef.current.emit('join-room', roomId)
            //  join Call room 
            socketRef.current.emit('join-room', callRoomId)

            socketRef.current.emit('message-read', {
                roomId,
                readBy: docId
            })
        })

        socketRef.current.on('receive-message', (data) => {
            setMessages(prev => [...prev, data])
        })

        socketRef.current.on('message-seen', (data) => {
            setMessages(prev => prev.map(msg =>
                msg.sender === docId
                    ? { ...msg, isRead: true, readAt: data.readAt }
                    : msg
            ))
        })

        socketRef.current.on('user-typing', () => setIsTyping(true))
        socketRef.current.on('user-stop-typing', () => setIsTyping(false))

        //  Incoming call 
        socketRef.current.on('incoming-call', (data) => {
            console.log('[DoctorChat] incoming-call:', data)
            if (data.callerId === docId) return

            // join Call room 
            socketRef.current.emit('join-room', data.roomId)

            setIncomingCallData(data)
            setIsCalling(false)
            setShowVideoCall(true)
        })

        socketRef.current.on('disconnect', () => setConnected(false))

        return () => {
            socketRef.current.disconnect()
        }
    }, [roomId, callRoomId, docId])

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/chat/history/${roomId}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                    },
                    credentials: 'include'
                })
                const data = await res.json()
                if (data.success) setMessages(data.messages)
                await axios.put(
                    backendUrl + `/api/chat/mark-read/${roomId}`,
                    { readBy: docId },
                    { withCredentials: true }
                )
            } catch (err) {
                console.log(err)
                toast.error('Unable to load chat history.')
            }
        }
        loadHistory()
    }, [roomId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() && !selectedImage) return

        if (selectedImage) {
            const formData = new FormData()
            formData.append('image', selectedImage)
            formData.append('roomId', roomId)
            formData.append('sender', docId)
            formData.append('senderType', 'doctor')
            formData.append('name', 'Doctor')

            try {
                const { data } = await axios.post(
                    backendUrl + '/api/chat/upload-image',
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true }
                )
                if (data.success) {
                    socketRef.current.emit('send-message', {
                        roomId,
                        message: '',
                        imageUrl: data.imageUrl,
                        sender: docId,
                        senderType: 'doctor',
                        name: 'Doctor'
                    })
                }
            } catch (err) {
                console.log(err)
                toast.error('Image upload failed. Please try again.')
            }

            setSelectedImage(null)
            setInput('')
            return
        }

        socketRef.current.emit('send-message', {
            roomId,
            message: input.trim(),
            sender: docId,
            senderType: 'doctor',
            name: 'Doctor'
        })
        setInput('')
    }

    const handleTyping = (e) => {
        setInput(e.target.value)
        socketRef.current.emit('typing', { roomId, name: 'Doctor' })
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current.emit('stop-typing', { roomId })
        }, 2000)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setSelectedImage(file)
        setInput(file.name)
        e.target.value = ''
    }

    //  Doctor call to  patient 
    return (
        <div className='flex h-[min(650px,calc(100dvh-2rem))] min-h-105 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl'>

            {/* Header */}
            <div className='bg-linear-to-r from-blue-700 to-teal-600 px-4 py-3 flex items-center gap-3'>
                {patientImage && (
                    <img src={patientImage} alt={patientName}
                        className='w-9 h-9 rounded-full object-cover border-2 border-white' />
                )}
                <div className='flex-1'>
                    <p className='text-white font-semibold text-sm'>
                        {patientName || 'Patient'}
                    </p>
                    <p className='text-blue-100 text-xs flex items-center gap-1'>
                        <img
                            src={
                                isTyping
                                    ? assets.chattingIcon
                                    : connected
                                        ? assets.onlineIcon
                                        : assets.offlineIcon
                            }
                            alt="status"
                            className="w-5 h-5"
                        />

                        {isTyping
                            ? 'Typing...'
                            : connected
                                ? 'Online'
                                : 'Offline'}
                    </p>
                </div>

                <div className='flex items-center gap-1 sm:gap-2 shrink-0'>
                    <button
                        onClick={() => { setCallType('audio'); setIsCalling(true); setShowVideoCall(true) }}
                        className='w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition text-sm sm:text-base'
                        title="Audio Call"
                    >
                        <img src={assets.audioIcon} alt="" />
                    </button>
                    <button
                        onClick={() => { setCallType('video'); setIsCalling(true); setShowVideoCall(true) }}
                        className='w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition text-sm sm:text-base'
                        title="Video Call"
                    >
                        <img src={assets.videoIcon} alt="" />
                    </button>
                    {onClose && (
                        <button onClick={onClose} className='text-white hover:text-blue-200 text-lg ml-1 w-8 h-8 flex items-center justify-center'>
                            <img className="w-5 h-5 transition transform hover:scale-110" src={assets.crossIcon} alt="" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50'>
                {messages.length === 0 && (
                    <p className='text-center text-gray-400 text-sm mt-10'>
                        <img src={assets.waitingIcon} alt="" /> No messages yet
                    </p>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm ${msg.senderType === 'doctor'
                            ? 'bg-indigo-100 text-indigo-900 rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none shadow'
                            }`}>
                            {msg.imageUrl && (
                                <img
                                    src={msg.imageUrl}
                                    alt='chat-img'
                                    className='max-w-full rounded-lg mb-1 cursor-pointer'
                                    onClick={() => window.open(msg.imageUrl, '_blank')}
                                />
                            )}
                            <p>{msg.message}</p>
                            <p className='text-xs mt-1 opacity-60'>
                                {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.sender === docId && (
                                    <span className='ml-1 flex items-center'>
                                        <img
                                            src={msg.isRead ? assets.readIcon : assets.sendIcon}
                                            alt=""
                                            className="w-6 h-6"
                                            style={{ filter: 'invert(48%) sepia(79%) saturate(476%) hue-rotate(86deg) brightness(118%) contrast(119%)' }}
                                        />
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className='flex justify-start'>
                        <div className='bg-white px-4 py-2 rounded-2xl shadow'>
                            <div className='flex gap-1'>
                                <span className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '0ms' }}></span>
                                <span className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '150ms' }}></span>
                                <span className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className='border-t p-2 sm:p-3 flex gap-2 bg-white shrink-0 pb-[env(safe-area-inset-bottom,8px)]'>

                <label className='cursor-pointer flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition'>
                    <img className='h-4 w-4' src={assets.attachIcon} alt="" />
                    <input
                        type='file'
                        accept='image/*'
                        onChange={handleImageSelect}
                        className='hidden'
                    />
                </label>
                <input
                    type='text'
                    value={input}
                    onChange={handleTyping}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter your response for the patient..."
                    className='flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-400'
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim() && !selectedImage}
                    className='bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition'
                >
                    <img src={assets.sendMsgIcon} alt="" />
                </button>
            </div>

            {/*  VideoCall */}
            {showVideoCall && (
                <div className='fixed inset-0 bg-black/90 z-50'>
                    <DoctorVideoCall
                        socketRef={socketRef}
                        roomId={callRoomId}
                        callType={incomingCallData?.callType || callType}
                        isInitiator={isCalling}
                        callerId={isCalling ? docId : incomingCallData?.callerId}
                        callerModel={isCalling ? 'doctor' : incomingCallData?.callerModel}
                        receiverId={isCalling ? patientId : docId}
                        receiverModel={isCalling ? 'user' : 'doctor'}
                        callerName={isCalling ? (profileData?.name || 'Doctor') : incomingCallData?.callerName}
                        callerImage={isCalling ? profileData?.image : incomingCallData?.callerImage}
                        receiverName={isCalling ? patientName : (profileData?.name || 'Doctor')}
                        receiverImage={isCalling ? patientImage : profileData?.image}
                        incomingCall={incomingCallData}
                        onClose={() => {
                            setShowVideoCall(false)
                            setIncomingCallData(null)
                            setIsCalling(false)
                        }}
                    />
                </div>
            )}
        </div>
    )
}

export default DoctorChat