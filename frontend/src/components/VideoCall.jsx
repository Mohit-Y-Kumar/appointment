import React, { useEffect, useState, useRef, useContext } from 'react'
import { io } from 'socket.io-client'
import Peer from 'simple-peer'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import { toast } from 'react-toastify'

const VideoCall = ({
    socketRef: externalSocketRef,
    roomId,
    callType = 'audio',
    isInitiator = false,
    initialIncomingCall = null,   
    callerId,
    callerModel,
    receiverId,
    receiverModel,
    callerName = '',
    callerImage = '',
    receiverName = '',
    receiverImage = '',
    onClose
}) => {
    const { backendUrl } = useContext(AppContext)

    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [error, setError] = useState(null)
    const [callStatus, setCallStatus] = useState('idle')
    const [duration, setDuration] = useState(0)


    // Incoming call popup — set immediately from prop (no event wait)
    const [incomingCall, setIncomingCall] = useState(initialIncomingCall)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const streamRef = useRef(null)
    const timerRef = useRef(null)
    const internalSocketRef = useRef(null)
    const peerRef = useRef(null)
    const pendingSignalsRef = useRef([])
    const callInitiatedRef = useRef(false)
    const roomJoinedRef = useRef(false)

    // Always use external socket if available
    const getSocket = () => externalSocketRef?.current || internalSocketRef.current

    // Show incoming popup immediately if prop is set
    useEffect(() => {
        if (initialIncomingCall && !isInitiator) {
            setIncomingCall(initialIncomingCall)
            setCallStatus('ringing')
        }
    }, []) 

    //  Socket — use external or create own
    useEffect(() => {
        if (externalSocketRef?.current) {
            const sock = externalSocketRef.current
            if (!roomJoinedRef.current && sock.connected) {
                sock.emit('join-room', roomId)
                roomJoinedRef.current = true
                console.log('[VideoCall] Room ensure (external socket):', roomId)
            }
            return () => { }
        }

        // Fallback: own socket
        const socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
        })
        internalSocketRef.current = socket

        socket.on('connect', () => {
            console.log('[VideoCall] Own socket connected:', socket.id)
            if (!roomJoinedRef.current) {
                socket.emit('join-room', roomId)
                roomJoinedRef.current = true
            }
        })

        return () => { socket.disconnect() }
    }, [backendUrl, roomId]) 

    //  Socket event listeners
    useEffect(() => {
        const socket = getSocket()
        if (!socket) return

        const onCallAccepted = () => {
            console.log('[VideoCall] call-accepted')
            if (!isInitiator) return
            if (peerRef.current) return
            if (!streamRef.current) return

            const peer = new Peer({
                initiator: true,
                trickle: false,
                stream: streamRef.current
            })

            peer.on('signal', sd => socket.emit('signal', { roomId, signalData: sd }))

            peer.on('stream', stream => {
                setRemoteStream(stream)
                setCallStatus('accepted')
            })

            peer.on('error', () => setError('Connection failed.'))

            peerRef.current = peer

            pendingSignalsRef.current.forEach(sig => {
                try { peer.signal(sig) } catch (error) { console.warn('[VideoCall] Invalid pending signal', error) }
            })
            pendingSignalsRef.current = []
        }

        const onCallRejected = () => {
            console.log('[VideoCall] call-rejected')

            //  prevent duplicate toast
            if (callStatus === 'rejected') return

            setCallStatus('rejected')
            toast.error('Call rejected by Doctor')
            onClose()
        }

        const onCallEnded = () => {
            _cleanup(false)
        }

        const onSignal = ({ signalData }) => {
            if (peerRef.current && !peerRef.current.destroyed) {
                try { peerRef.current.signal(signalData) } catch (error) { console.warn('[VideoCall] Invalid signal', error) }
            } else {
                pendingSignalsRef.current.push(signalData)
            }
        }

        //  remove old listeners before adding
        socket.off('call-accepted', onCallAccepted)
        socket.off('call-rejected', onCallRejected)
        socket.off('call-ended', onCallEnded)
        socket.off('signal', onSignal)

        socket.on('call-accepted', onCallAccepted)
        socket.on('call-rejected', onCallRejected)
        socket.on('call-ended', onCallEnded)
        socket.on('signal', onSignal)

        return () => {
            socket.off('call-accepted', onCallAccepted)
            socket.off('call-rejected', onCallRejected)
            socket.off('call-ended', onCallEnded)
            socket.off('signal', onSignal)
        }

    }, [roomId, isInitiator])


    //  Local media
    useEffect(() => {
        ; (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    setError('Camera/mic not supported. Use HTTPS or localhost.')
                    return
                }
                let stream
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: callType === 'video',
                        audio: true
                    })
                } catch {
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                }
                setLocalStream(stream)
                streamRef.current = stream
                if (localVideoRef.current && stream.getVideoTracks().length > 0) {
                    localVideoRef.current.srcObject = stream
                }
            } catch (err) {
                if (err.name === 'NotAllowedError') setError('Please allow camera & microphone access.')
                else if (err.name === 'NotFoundError') setError('Camera or microphone not found.')
                else setError(`Media error: ${err.message}`)
            }
        })()
        return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
    }, []) 

    // Auto-initiate (user → doctor)
    useEffect(() => {
        if (!isInitiator || !localStream || callInitiatedRef.current) return
        callInitiatedRef.current = true
        const t = setTimeout(_initiateCall, 800)
        return () => clearTimeout(t)
    }, [isInitiator, localStream]) 

    //  Attach remote stream
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    //  Timer
    useEffect(() => {
        if (callStatus === 'accepted') {
            timerRef.current = setInterval(() => setDuration(p => p + 1), 1000)
        } else {
            clearInterval(timerRef.current)
        }
        return () => clearInterval(timerRef.current)
    }, [callStatus])

    // Helpers
    const _initiateCall = () => {
        const socket = getSocket()
        if (!socket) { setError('Socket not ready.'); return }
        if (!streamRef.current) { setError('Camera not ready.'); return }
        if (!roomJoinedRef.current) {
            socket.emit('join-room', roomId)
            roomJoinedRef.current = true
        }
        console.log('[VideoCall] Emitting call-user, room:', roomId)
        setCallStatus('ringing')
        socket.emit('call-user', {
            roomId, callerId, callerModel,
            receiverId, receiverModel,
            callType, callerName, callerImage
        })
    }

    const _cleanup = (emitEnded = true) => {
        const socket = getSocket()
        if (emitEnded && socket) socket.emit('call-ended', { roomId })
        peerRef.current?.destroy()
        peerRef.current = null
        streamRef.current?.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        setCallStatus('ended')
        setDuration(0)
        onClose()
    }

    const fmt = s => {
        const m = Math.floor(s / 60).toString().padStart(2, '0')
        const sec = (s % 60).toString().padStart(2, '0')
        return `${m}:${sec}`
    }

    // Actions
    const acceptCall = () => {
        const socket = getSocket()
        if (!streamRef.current) { setError('Camera not ready.'); return }
        if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }

        setIncomingCall(null)
        setCallStatus('connecting')

        if (!roomJoinedRef.current) {
            socket.emit('join-room', roomId)
            roomJoinedRef.current = true
        }
        socket.emit('call-accepted', { roomId })
        console.log('[VideoCall] Accepted — creating RECEIVER peer')

        const peer = new Peer({ initiator: false, trickle: false, stream: streamRef.current })

        peer.on('signal', sd => socket.emit('signal', { roomId, signalData: sd }))
        peer.on('stream', stream => {
            console.log('[VideoCall] Remote stream (receiver)')
            setRemoteStream(stream)
            setCallStatus('accepted')
        })
        peer.on('error', err => {
            console.error('[VideoCall] Peer error (receiver):', err)
            setError('Connection failed.')
        })

        peerRef.current = peer
        pendingSignalsRef.current.forEach(sig => {
            try { if (!peer.destroyed) peer.signal(sig) } catch (error) { console.warn('[VideoCall] Invalid pending signal', error) }
        })
        pendingSignalsRef.current = []
    }

    const rejectCall = () => {
        const socket = getSocket()
        setIncomingCall(null)
        if (socket) socket.emit('call-rejected', { roomId })
        setCallStatus('idle')
        onClose()
    }

    const endCall = () => _cleanup(true)
    const toggleMute = () => {
        localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
        setIsMuted(p => !p)
    }
    const toggleVideo = () => {
        localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
        setIsVideoOff(p => !p)
    }

    return (
        <div className='w-full h-full bg-black flex flex-col relative overflow-hidden'>

            {/* Error */}
            {error && (
                <div className='absolute top-4 inset-x-0 flex justify-center z-20 px-4'>
                    <p className='bg-red-500 text-white px-4 py-2 rounded-full text-sm shadow-lg'>{error}</p>
                </div>
            )}

            {/* Timer */}
            {callStatus === 'accepted' && (
                <div className='absolute top-4 inset-x-0 flex justify-center z-20'>
                    <div className=' backdrop-blur text-white px-4 py-1 rounded-full text-sm flex items-center gap-2'>
                        <img src={assets.clockIcon} className='h-4 w-4 shrink-0' alt='' />
                        <span className='tabular-nums'>{fmt(duration)}</span>
                    </div>
                </div>
            )}

            {/* Remote video / waiting screen */}
            <div className='flex-1 relative bg-gray-900'>
                {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className='w-full h-full object-cover' />
                ) : (
                    <div className='w-full h-full flex flex-col items-center justify-center bg-gray-800 gap-3'>
                        <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center'>
                            {receiverImage
                                ? <img src={receiverImage} className='w-full h-full object-cover'
                                    onError={e => { e.target.onerror = null; e.target.style.display = 'none' }} />
                                : <img src={assets.docIcon} className='w-12 h-12 opacity-60' alt='' />
                            }
                        </div>
                        <p className='text-white font-medium text-sm'>{receiverName}</p>
                        <p className='text-gray-400 text-sm'>
                            {callStatus === 'idle' && 'Connecting…'}
                            {callStatus === 'ringing' && 'Ringing…'}
                            {callStatus === 'connecting' && 'Connecting…'}
                            {callStatus === 'ended' && 'Call Ended'}
                        </p>
                    </div>
                )}

                {/*  local preview */}
                <div className='absolute bottom-4 right-4 w-24 h-32 sm:w-28 sm:h-40 rounded-2xl overflow-hidden border-2 border-white shadow-xl z-10'>
                    {!isVideoOff
                        ? <video ref={localVideoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
                        : <div className='w-full h-full bg-gray-700 flex items-center justify-center'>
                            <img src={assets.userIcon} className='h-10 w-10 opacity-50' alt='' />
                        </div>
                    }
                </div>
            </div>

            {/* Controls */}
            <div className='bg-black/90 py-5 flex items-center justify-center gap-5 shrink-0'>
                <button onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                        ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}>
                    <img src={isMuted ? assets.muteMicIcon : assets.micIcon} className='w-6 h-6' alt='mic' />
                </button>
                {callType === 'video' && (
                    <button onClick={toggleVideo}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                            ${isVideoOff ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}>
                        <img src={isVideoOff ? assets.muteVideoIcon : assets.videoIcon} className='w-6 h-6' alt='video' />
                    </button>
                )}
                <button onClick={endCall}
                    className='w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors'>
                    <img src={assets.callEndIcon} className='w-7 h-7' alt='end' />
                </button>
            </div>

            {/* Incoming Call Popup doctor → user */}
            {incomingCall && callStatus !== 'accepted' && (
                <div className='fixed inset-0 bg-black/75 z-50 flex items-center justify-center px-4'>
                    <div className='bg-white rounded-3xl p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-2xl'>

                        <div className='w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center'>
                            {incomingCall.callerImage
                                ? <img src={incomingCall.callerImage} className='w-full h-full object-cover' alt='' />
                                : <img src={assets.docIcon} className='w-12 h-12 opacity-60' alt='' />
                            }
                        </div>

                        <div className='text-center'>
                            <p className='text-gray-900 font-semibold text-lg'>
                                {incomingCall.callerName || 'Doctor'}
                            </p>
                            <p className='text-gray-400 text-sm mt-0.5'>
                                Incoming {incomingCall.callType === 'video' ? 'Video' : 'Audio'} Call
                            </p>
                        </div>

                        <div className='flex gap-10 mt-1'>
                            <div className='flex flex-col items-center gap-1'>
                                <button onClick={rejectCall}
                                    className='w-14 h-14 rounded-full bg-red-200 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors'>
                                    <img src={assets.callEndIcon} className='w-7 h-7' alt='decline' />
                                </button>
                                <span className='text-xs text-gray-400'>Decline</span>
                            </div>
                            <div className='flex flex-col items-center gap-1'>
                                <button onClick={acceptCall}
                                    className='w-14 h-14 rounded-full bg-green-200 hover:bg-green-400 flex items-center justify-center shadow-lg transition-colors'>
                                    <img src={incomingCall.callType === 'video' ? assets.videoIcon : assets.micIcon}
                                        className='w-7 h-7' alt='accept' />
                                </button>
                                <span className='text-xs text-gray-400'>Accept</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default VideoCall