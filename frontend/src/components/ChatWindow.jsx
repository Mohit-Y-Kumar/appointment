import React, { useState, useEffect, useRef, useContext } from 'react'
import { io } from 'socket.io-client'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import VideoCall from './VideoCall'
import { assets } from '../assets/assets'
import { toast } from 'react-toastify'



const ChatWindow = ({ appointmentId, doctorId, doctorName, doctorImage, onClose }) => {
    const { backendUrl, userData } = useContext(AppContext)

    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [connected, setConnected] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)

    // Call state
    const [showVideoCall, setShowVideoCall]       = useState(false)
    const [callRoomId, setCallRoomId]             = useState(null)
    const [callType, setCallType]                 = useState('audio')
    const [isInitiator, setIsInitiator]           = useState(false)
    const [initialIncomingCall, setInitialIncomingCall] = useState(null)  // doctor → user incoming call data

    const socketRef        = useRef(null)
    const messagesEndRef   = useRef(null)
    const typingTimeoutRef = useRef(null)

    const chatRoomId = `chat_${appointmentId}`
   // Unique call room for this user and doctor
    const myCallRoomId = `call_${doctorId}_${userData?._id}`

    // Setup socket connection
    useEffect(() => {
        const socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
        })
        socketRef.current = socket

        socket.on('connect', () => {
            setConnected(true)
            // Chat room join 
            socket.emit('join-room', chatRoomId)


            //  Join the call room first so you can receive incoming calls from the doctor
            socket.emit('join-room', myCallRoomId)
            socket.emit('message-read', { roomId: chatRoomId, readBy: userData?._id })
            console.log('[ChatWindow] Joined rooms:', chatRoomId, myCallRoomId)
        })

        // Update message read status
        socket.on('message-seen', (data) => {
            setMessages(prev => prev.map(msg =>
                msg.sender === userData?._id
                    ? { ...msg, isRead: true, readAt: data.readAt }
                    : msg
            ))
        })

        socket.on('receive-message', (data) => {
            setMessages(prev => [...prev, data])
        })

        // Typing indicators
        socket.on('user-typing',      () => setIsTyping(true))
        socket.on('user-stop-typing', () => setIsTyping(false))
        socket.on('disconnect',       () => setConnected(false))

        //  Doctor call to  user 
        socket.on('incoming-call', (data) => {
            console.log('[ChatWindow] incoming-call received:', data)

           // Ignore if this is your own outgoing call
            if (data.callerId === userData?._id) return

          // Join call room if not already joined
            socket.emit('join-room', data.roomId)

           // Save incoming call data so VideoCall can use it
            setInitialIncomingCall(data)
            setCallRoomId(data.roomId)
            setCallType(data.callType || 'audio')
            setIsInitiator(false)
            setShowVideoCall(true)
        })

       // When doctor rejects the call
        socket.on('call-rejected', () => {
            setShowVideoCall(false)
            setCallRoomId(null)
            setInitialIncomingCall(null)
            setIsInitiator(false)
            toast.info('Call was rejected.')
        })

        return () => { socket.disconnect() }
    }, [chatRoomId, myCallRoomId, userData?._id, backendUrl])

   // Load previous chat messages
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const { data } = await axios.get(backendUrl + `/api/chat/history/${chatRoomId}`, { withCredentials: true })
                if (data.success) setMessages(data.messages)
                await axios.put(backendUrl + `/api/chat/mark-read/${chatRoomId}`, { readBy: userData?._id }, { withCredentials: true })
            } catch (err) {
                console.log(err)
                toast.error('Unable to load chat history.')
            }
        }
        loadHistory()
    }, [chatRoomId, backendUrl, userData?._id])

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    //  Send message
    const sendMessage = async () => {
        if (!input.trim() && !selectedImage) return

        if (selectedImage) {
            const formData = new FormData()
            formData.append('image', selectedImage)
            formData.append('roomId', chatRoomId)
            formData.append('sender', userData?._id)
            formData.append('senderType', 'user')
            formData.append('name', userData?.name)
            try {
                const { data } = await axios.post(backendUrl + '/api/chat/upload-image', formData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true })
                if (data.success) {
                    socketRef.current.emit('send-message', {
                        roomId: chatRoomId, message: '', imageUrl: data.imageUrl,
                        sender: userData?._id, senderType: 'user', name: userData?.name
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
            roomId: chatRoomId, message: input.trim(),
            sender: userData?._id, senderType: 'user', name: userData?.name
        })
        setInput('')
    }

    // Handle image selection
    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setSelectedImage(file)
        setInput(file.name)
        e.target.value = ''
    }


    // Handle typing event
    const handleTyping = (e) => {
        if (selectedImage) setSelectedImage(null)
        setInput(e.target.value)
        socketRef.current.emit('typing', { roomId: chatRoomId, name: userData?.name })
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current.emit('stop-typing', { roomId: chatRoomId })
        }, 2000)
    }

    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // User start a call to doctor
    const startCall = (type) => {
        setCallRoomId(myCallRoomId)
        setCallType(type)
        setIsInitiator(true)
        setInitialIncomingCall(null)
        setShowVideoCall(true)
        console.log('[ChatWindow] Starting outgoing call:', myCallRoomId)
    }

    // Close call screen and reset state
    const handleCallClose = () => {
        setShowVideoCall(false)
        setCallRoomId(null)
        setCallType('audio')
        setIsInitiator(false)
        setInitialIncomingCall(null)
    }

    return (
        <div className='flex h-[min(650px,calc(100dvh-2rem))] min-h-105 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl'>

            {/* Header */}
            <div className='bg-linear-to-r from-primary to-accent px-4 py-3 flex items-center gap-3'>
                <img src={doctorImage} alt={doctorName}
                    className='w-9 h-9 rounded-full object-cover border-2 border-white' />
                <div className='flex-1'>
                    <p className='text-white font-semibold text-sm'>{doctorName}</p>
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

                        <span>
                            {isTyping
                                ? 'Doctor is typing...'
                                : connected
                                    ? 'Online'
                                    : 'Offline'}
                        </span>
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <button
                        onClick={() => startCall('audio')}
                        title='Audio Call'
                        className='w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition'
                    >
                        <img src={assets.audioIcon} alt="audio call" className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => startCall('video')}
                        title='Video Call'
                        className='w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition'
                    >
                        <img src={assets.videoIcon} alt="video call" className="w-4 h-4" />
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
                    <div className="text-center text-gray-400 mt-10 flex flex-col items-center gap-2">
                        <img
                            src={assets.waitingIcon}
                            alt="waiting"
                            className="w-6 h-6 opacity-70"
                        />
                        <p className="text-sm"> Start a conversation with your doctor</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index}
                        className={`flex ${msg.sender === userData?._id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                            msg.sender === userData?._id
                                ? 'bg-indigo-100 text-indigo-900 rounded-br-none'   
                            : 'bg-white text-gray-800 rounded-bl-none shadow'
                        }`}>
                            {msg.imageUrl && (
                                <img src={msg.imageUrl} alt='chat-img'
                                    className='max-w-full rounded-lg mb-1 cursor-pointer'
                                    onClick={() => window.open(msg.imageUrl, '_blank')} />
                            )}
                            {msg.message && <p>{msg.message}</p>}
                            <p className='text-xs mt-1 opacity-60'>
                                {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.sender === userData?._id && (
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
            <div className='border-t p-3 bg-white'>

                {/* Selected Image */}
                {selectedImage && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
                        <span className="max-w-50 truncate">
                            {selectedImage.name}
                        </span>
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="text-red-500 hover:text-red-700 flex items-center justify-center"
                        >
                            <img
                                src={assets.crossIcon}
                                alt=""
                                className="w-3 h-3 filter invert"
                            />
                        </button>
                    </div>
                )}

                {/* Input Row */}
                <div className='flex gap-2'>
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
                        placeholder="Type your message..."
                        className='flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-400'
                    />

                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() && !selectedImage}
                        className='bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition'
                    >
                        <img src={assets.sendMsgIcon} alt="" className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* VideoCall overlay */}
            {showVideoCall && callRoomId && (
                <div className='fixed inset-0 bg-black/90 z-50'>
                    <VideoCall
                        socketRef={socketRef}
                        roomId={callRoomId}
                        callType={callType}
                        isInitiator={isInitiator}
                        initialIncomingCall={initialIncomingCall}
                        callerId={userData?._id}
                        callerModel='user'
                        receiverId={doctorId}
                        receiverModel='doctor'
                        callerName={userData?.name}
                        callerImage={userData?.image}
                        receiverName={doctorName}
                        receiverImage={doctorImage}
                        onClose={handleCallClose}
                    />
                </div>
            )}
        </div>
    )
}

export default ChatWindow