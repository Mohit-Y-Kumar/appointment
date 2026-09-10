import React, { useEffect, useState, useRef } from 'react'
import Peer from 'simple-peer'
import { assets } from '../../assets/assets'
import { toast } from 'react-toastify'


const DoctorVideoCall = ({
    socketRef,
    roomId,
    incomingCall,         
    callType = 'video',
    isInitiator = false,
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
    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [error, setError] = useState(null)
    const [callStatus, setCallStatus] = useState('idle')
    const [duration, setDuration] = useState(0)
    const [incomingCallState, setIncomingCallState] = useState(incomingCall || null)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const pendingSignalsRef = useRef([])
    const streamRef = useRef(null)
    const timerRef = useRef(null)
    const peerRef = useRef(null)
    const callInitiatedRef = useRef(false)
    const roomJoinedRef = useRef(false)

    // 1. Join room immediately on mount both caller and receiver 
    useEffect(() => {
        const socket = socketRef?.current
        if (!socket) return

        const doJoin = () => {
            if (!roomJoinedRef.current) {
                socket.emit('join-room', roomId)
                roomJoinedRef.current = true
                console.log('[DoctorVideoCall] Joined room:', roomId)
            }
        }

        if (socket.connected) doJoin()
        else socket.once('connect', doJoin)

        return () => socket.off('connect', doJoin)
    }, [socketRef, roomId])

    //  All socket event listeners
    useEffect(() => {
        const socket = socketRef?.current
        if (!socket) return

        //  Receiver side: user called the doctor 
        const onIncomingCall = (data) => {
            console.log('[DoctorVideoCall] incoming-call received:', data)
            if (isInitiator) return     
            setIncomingCallState(data)
            setCallStatus('ringing')
        }

        // Caller side: user accepted
        const onCallAccepted = () => {
            console.log('[DoctorVideoCall] call-accepted')
            if (!isInitiator) return

            if (peerRef.current) { console.warn('Peer already exists'); return }
            if (!streamRef.current) { console.warn('Stream not ready'); return }

            console.log('[DoctorVideoCall] Creating INITIATOR peer')
            try {
                const peer = new Peer({
                    initiator: true,
                    trickle: false,
                    stream: streamRef.current
                })

                peer.on('signal', sd =>
                    socketRef.current.emit('signal', { roomId, signalData: sd }))

                peer.on('stream', stream => {
                    console.log('[DoctorVideoCall] Remote stream arrived (initiator)')
                    setRemoteStream(stream)
                    setCallStatus('accepted')   
                })

                peer.on('error', err => {
                    console.error('[DoctorVideoCall] Peer error:', err)
                    setError('Connection failed.')
                })

                peerRef.current = peer

                pendingSignalsRef.current.forEach(sig => {
                    try { if (!peer.destroyed) peer.signal(sig) }
                    catch (e) { console.warn('Flush signal err:', e.message) }
                })
                pendingSignalsRef.current = []

            } catch (err) {
                console.error('[DoctorVideoCall] Peer creation failed:', err)
                setError('Cannot create peer connection.')
            }
        }

        const onCallRejected = () => {
            console.log('[DoctorVideoCall] call-rejected')
            setCallStatus('rejected')
            toast.error('Call rejected by patient')
            onClose()
        }

        const onCallEnded = () => {
            console.log('[DoctorVideoCall] call-ended by remote')
            _cleanup(false)
        }

        const onSignal = ({ signalData }) => {
            if (peerRef.current && !peerRef.current.destroyed) {
                try { peerRef.current.signal(signalData) }
                catch (e) { console.warn('[DoctorVideoCall] signal err:', e.message) }
            } else {
                pendingSignalsRef.current.push(signalData)
            }
        }

        socket.on('incoming-call', onIncomingCall)
        socket.on('call-accepted', onCallAccepted)
        socket.on('call-rejected', onCallRejected)
        socket.on('call-ended', onCallEnded)
        socket.on('signal', onSignal)

        return () => {
            socket.off('incoming-call', onIncomingCall)
            socket.off('call-accepted', onCallAccepted)
            socket.off('call-rejected', onCallRejected)
            socket.off('call-ended', onCallEnded)
            socket.off('signal', onSignal)
        }
    }, [socketRef, isInitiator, roomId, onClose]) 

    //  Get local media
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
                if (err.name === 'NotAllowedError') setError('Camera/mic permission required.')
                else if (err.name === 'NotFoundError') setError('Camera/mic not found.')
                else setError(`Media error: ${err.message}`)
            }
        })()

        return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
    }, []) 

    //  Auto-initiate when doctor is caller and stream is ready
    useEffect(() => {
        if (!isInitiator || !localStream || callInitiatedRef.current) return
        callInitiatedRef.current = true
        const t = setTimeout(_initiateCall, 700)
        return () => clearTimeout(t)
    }, [isInitiator, localStream]) 

    //  Attach remote stream
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    // Timer
    useEffect(() => {
        if (callStatus === 'accepted') {
            timerRef.current = setInterval(() => setDuration(p => p + 1), 1000)
        } else {
            clearInterval(timerRef.current)
        }
        return () => clearInterval(timerRef.current)
    }, [callStatus])

    const _initiateCall = () => {
        if (!streamRef.current) { setError('Camera not ready.'); return }
        if (!roomJoinedRef.current) {
            socketRef.current.emit('join-room', roomId)
            roomJoinedRef.current = true
        }
        console.log('[DoctorVideoCall] Emitting call-user')
        setCallStatus('ringing')
        socketRef.current.emit('call-user', {
            roomId, callerId, callerModel,
            receiverId, receiverModel,
            callType, callerName, callerImage
        })
    }

    const _cleanup = (emitEnded = true) => {
        if (emitEnded && socketRef.current) {
            socketRef.current.emit('call-ended', { roomId })
        }
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

    const acceptCall = () => {
        if (!streamRef.current) { setError('Camera not ready.'); return }
        if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }

        setIncomingCallState(null)
        setCallStatus('connecting')

        if (!roomJoinedRef.current) {
            socketRef.current.emit('join-room', roomId)
            roomJoinedRef.current = true
        }
        socketRef.current.emit('call-accepted', { roomId })
        console.log('[DoctorVideoCall] Accepted — creating RECEIVER peer')

        try {
            const peer = new Peer({ initiator: false, trickle: false, stream: streamRef.current })

            peer.on('signal', sd =>
                socketRef.current.emit('signal', { roomId, signalData: sd }))

            peer.on('stream', stream => {
                console.log('[DoctorVideoCall] Remote stream arrived (receiver)')
                setRemoteStream(stream)
                setCallStatus('accepted')
            })

            peer.on('error', err => {
                console.error('[DoctorVideoCall] Peer error (receiver):', err)
                setError('Connection failed.')
            })

            peerRef.current = peer

            pendingSignalsRef.current.forEach(sig => {
                try { if (!peer.destroyed) peer.signal(sig) }
                catch (e) { console.warn('Flush signal err:', e.message) }
            })
            pendingSignalsRef.current = []

        } catch (err) {
            console.error('[DoctorVideoCall] Peer creation failed:', err)
            setError('Cannot create peer connection.')
        }
    }

    const rejectCall = () => {
        setIncomingCallState(null)
        socketRef.current.emit('call-rejected', { roomId })
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
        <div className='fixed inset-0 bg-black z-50 flex flex-col overflow-hidden'>

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

            {/* Remote video / waiting */}
            <div className='flex-1 relative bg-gray-900'>
                {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline
                        className='w-full h-full object-cover' />
                ) : (
                    <div className='w-full h-full flex flex-col items-center justify-center bg-gray-800 gap-3'>
                        <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center'>
                            {receiverImage
                                ? <img src={receiverImage} className='w-full h-full object-cover'
                                    onError={e => { e.target.onerror = null; e.target.style.display = 'none' }} />
                                : <img src={assets.userIcon} className='w-10 h-10 opacity-60' alt='' />
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
                        ? <video ref={localVideoRef} autoPlay muted playsInline
                            className='w-full h-full object-cover' />
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
                        <img src={isVideoOff ? assets.muteVideoIcon : assets.videoIcon}
                            className='w-6 h-6' alt='video' />
                    </button>
                )}

                <button onClick={endCall}
                    className='w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors'>
                    <img src={assets.callEndIcon} className='w-7 h-7' alt='end' />
                </button>
            </div>

            {/* Incoming Call Popup doctor receives call from user*/}
            {incomingCallState && callStatus !== 'accepted' && (
                <div className='fixed inset-0 bg-black/75 z-50 flex items-center justify-center px-4'>
                    <div className='bg-white rounded-3xl p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-2xl'>

                        {/* Caller avatar */}
                        <div className='w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center'>
                            {incomingCallState.callerImage
                                ? <img src={incomingCallState.callerImage} className='w-full h-full object-cover' alt='' />
                                : <img src={assets.userIcon} className='w-12 h-12 opacity-60' alt='' />
                            }
                        </div>

                        {/* Caller info */}
                        <div className='text-center'>
                            <p className='text-gray-900 font-semibold text-lg'>
                                {incomingCallState.callerName || 'Patient'}
                            </p>
                            <p className='text-gray-400 text-sm mt-0.5'>
                                Incoming {incomingCallState.callType === 'video' ? 'Video' : 'Audio'} Call
                            </p>
                        </div>

                        {/* Accept / Reject */}
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
                                    <img src={incomingCallState.callType === 'video' ? assets.videoIcon : assets.micIcon}
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

export default DoctorVideoCall