import React, { useEffect, useState, useRef } from 'react'

import Peer from 'simple-peer'

import { assets } from './assets'



const DoctorVideoCall = ({
    socketRef,
    roomId,
    incomingCall,
    callType = 'video',
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

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const pendingSignalsRef = useRef([])
    const streamRef = useRef(null)
    const timerRef = useRef(null)
    const peerRef = useRef(null)
    const [incomingCallState, setIncomingCallState] = useState(incomingCall || null)
    useEffect(() => {
        const socket = socketRef.current
        if (!socket) return

        
        const onCallAccepted = () => {
            setCallStatus('accepted')
            if (peerRef.current) {
                console.warn('Peer already exists — skip')
                return
            }

            if (!streamRef.current) return
           
            try {
                const peer = new Peer({
                    initiator: true,   
                    trickle: false,
                    stream: streamRef.current
                })

                peer.on('signal', (signalData) => {
                    socketRef.current.emit('signal', { roomId, signalData })
                })

                peer.on('stream', (stream) => setRemoteStream(stream))

                peer.on('error', (err) => {
                    console.error('Peer error:', err)
                    setError('Connection failed')
                })

                peerRef.current = peer

                pendingSignalsRef.current.forEach(sig => {
                    try {
                        peer.signal(sig)
                    } catch (err) {
                        console.warn('Queued signal error:', err.message)
                    }
                })
                pendingSignalsRef.current = []

            } catch (err) {
                console.error('Peer creation failed:', err)
                setError('Cannot create peer connection')
            }

        }
        const onCallRejected = () => { setCallStatus('rejected'); onClose() }
        const onCallEnded = () => endCall()
        const onSignal = ({ signalData }) => {
            console.log('Signal received, type:', signalData?.type)
            console.log('Peer exists:', !!peerRef.current)
            console.log('Peer destroyed:', peerRef.current?.destroyed)
            if (peerRef.current) {
                try {
                    if (!peerRef.current.destroyed) {
                        peerRef.current.signal(signalData)
                    }
                    } catch (error) {
                        console.warn('Signal ignored:', error.message)
                }
            } else {
                
                pendingSignalsRef.current.push(signalData)
            }
        }

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
    }, [socketRef, onClose])



    
    useEffect(() => {
        const startLocalStream = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setError('Camera/Mic supported nahi — HTTPS use karo ya localhost pe chalao')
                    return
                }

                let stream;

                try {
                   
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: callType === 'video',
                        audio: true
                    })
                } catch {
                    
                    console.warn('Camera busy — audio only')
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    })
                }

                setLocalStream(stream)
                streamRef.current = stream

                if (localVideoRef.current && stream.getVideoTracks().length > 0) {
                    localVideoRef.current.srcObject = stream
                }

            } catch (err) {
                if (err.name === 'NotAllowedError') {
                    setError('Camera/Mic permission do')
                } else if (err.name === 'NotFoundError') {
                    setError('Camera/Mic nahi mila')
                } else {
                    setError(`Error: ${err.message}`)
                }
            }
        }
        startLocalStream()

        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop())
            clearInterval(timerRef.current)
        }
    }, [])

    // Remote stream
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    // Timer
    useEffect(() => {
        if (callStatus === 'accepted') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1)
            }, 1000)
        } else {
            clearInterval(timerRef.current)
        }
        return () => clearInterval(timerRef.current)
    }, [callStatus])

    const handleCallClick = () => {
        if (!streamRef.current) {
            setError('Camera/Mic abhi ready nahi hai')
            return
        }
        initiateCall()
    }

    const formatDuration = (s) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0')
        const sec = (s % 60).toString().padStart(2, '0')
        return `${m}:${sec}`
    }

    const toggleMute = () => {
        localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
        setIsMuted(prev => !prev)
    }

    const toggleVideo = () => {
        localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
        setIsVideoOff(prev => !prev)
    }

    const endCall = () => {
        peerRef.current?.destroy()
        streamRef.current?.getTracks().forEach(t => t.stop())
        socketRef.current?.emit('call-ended', { roomId })
        clearInterval(timerRef.current)
        setCallStatus('ended')
        setDuration(0)
        onClose()
    }

    const initiateCall = () => {

        if (!streamRef.current) {
            setError('Camera/Mic abhi ready nahi hai')
            return
        }
        setCallStatus('ringing')

        socketRef.current.emit('join-room', roomId)
        socketRef.current.emit('call-user', {  
            roomId,
            callerId,
            callerModel,
            receiverId,
            receiverModel,
            callType,
            callerName,
            callerImage
        })


    }

    const acceptCall = () => {
        if (!streamRef.current) {
            setError('Camera/Mic abhi ready nahi hai')
            return
        }
        if (peerRef.current) {
            peerRef.current.destroy()
            peerRef.current = null
        }

        setIncomingCallState(null)
        setCallStatus('accepted')

        socketRef.current.emit('join-room', roomId)
        socketRef.current.emit('call-accepted', { roomId })

        try {
            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: streamRef.current  
            })

            peer.on('signal', (signalData) => {
                socketRef.current.emit('signal', { roomId, signalData })
            })

            peer.on('stream', (stream) => setRemoteStream(stream))

            peer.on('error', (err) => {
                console.error('Peer error:', err)
                setError('Connection failed')
            })

            peerRef.current = peer

            pendingSignalsRef.current.forEach(sig => {
                try {
                    peer.signal(sig)
                } catch (err) {
                    console.warn('Queued signal error:', err.message)
                }
            })
            pendingSignalsRef.current = []

        } catch (err) {
            console.error('Peer creation failed:', err)
            setError('Cannot create peer connection')
        }
    }

    const rejectCall = () => {
        setIncomingCallState(null)
        socketRef.current.emit('call-rejected', { roomId })
        setCallStatus('idle')
        onClose()
    }

    return (
        <div className='fixed inset-0 bg-black z-50 flex flex-col'>

            {/* Error */}
            {error && (
                <div className='absolute top-4 left-0 right-0 flex justify-center z-10'>
                    <p className='bg-red-500 text-white px-4 py-2 rounded-full text-sm'>{error}</p>
                </div>
            )}

            {/* Timer */}
            {callStatus === 'accepted' && (
                <div className='absolute top-4 left-0 right-0 flex justify-center z-10'>
                    <p className='bg-black/50 text-white px-4 py-1 rounded-full text-sm'>
                        ⏱️ {formatDuration(duration)}
                    </p>
                </div>
            )}

            {/* Remote Video */}
            <div className='flex-1 relative bg-gray-900'>
                {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className='w-full h-full object-cover' />
                ) : (
                    <div className='w-full h-full flex flex-col items-center justify-center bg-gray-800'>
                        <div className='w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gray-600 flex items-center justify-center text-3xl sm:text-4xl mb-3 overflow-hidden'>
                            {receiverImage
                                ? <img
                                    src={receiverImage}
                                    className='w-full h-full rounded-full object-cover'
                                    onError={(e) => {
                                        e.target.onerror = null
                                        e.target.style.display = 'none'
                                    }}
                                />
                                : <span><img className='w-10 h-10' src={assets.incomingIcon} alt="" /></span>
                            }
                        </div>
                        <p className='text-white text-sm flex items-center gap-1'>

                            {callStatus === 'idle' && (
                                <>
                                    <img src={assets.audioCallIcon} className="w-4 h-4" />
                                    Calling...
                                </>
                            )}

                            {callStatus === 'ringing' && (
                                <>
                                    <img className='w-6 h-6' src={assets.bellIcon} alt="" />
                                    Calling {receiverName}...
                                </>
                            )}

                            {callStatus === 'ended' && (
                                <>
                                    <img className='w-8 h-8' src={assets.callEndIcon} alt="" />
                                    Call Ended
                                </>
                            )}
                        </p>
                    </div>
                )}

                {/* Local Video */}
                <div className='absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-24 h-32 sm:w-32 sm:h-44 rounded-xl overflow-hidden border-2 border-white shadow-lg'>
                    {!isVideoOff ? (
                        <video ref={localVideoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
                    ) : (
                        <div className='w-full h-full bg-gray-700 flex items-center justify-center text-2xl'>👤</div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className='bg-black/80 py-4 sm:py-6 flex items-center justify-center gap-3 sm:gap-6 shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]'>
                <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-gray-600'
                        }`}
                >
                    <img
                        src={isMuted ? assets.muteMicIcon : assets.micIcon}
                        alt="mic"
                        className="w-6 h-6"
                    />
                </button>
                {callType === 'video' && (
                    <button
                        onClick={toggleVideo}
                        className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'
                            }`}
                    >
                        <img
                            className='h-8 w-8'
                            src={isVideoOff ? assets.muteVideoIcon : assets.videoIcon}
                            alt="video toggle"
                        />
                    </button>
                )}

                <button
                    onClick={handleCallClick}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${!localStream ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-200'
                        }`}
                    disabled={!localStream}
                >
                    <img className='h-8 w-8' src={assets.audioIcon} alt="" />
                </button>

                <button
                    onClick={endCall}
                    className='w-14 h-14 rounded-full bg-gray-500 flex items-center justify-center text-xl'
                >
                    <img className='h-8 w-8' src={assets.callEndIcon} alt="" />
                </button>
            </div>

            {/* Incoming Call Popup */}
            {incomingCallState && callStatus !== 'accepted' && (
                <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4'>
                    <div className='bg-white rounded-2xl p-5 sm:p-6 w-full max-w-70 sm:max-w-xs flex flex-col items-center gap-3 sm:gap-4'>
                        {incomingCallState?.callerImage
                            ? <img src={incomingCallState.callerImage} className='w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover' />
                            : <div className='w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-300 flex items-center justify-center text-2xl sm:text-3xl'>👤</div>
                        }
                        <p className='text-gray-800 font-semibold text-base sm:text-lg text-center'>{incomingCallState?.callerName}</p>
                        <p className='text-gray-500 text-xs sm:text-sm flex items-center gap-1'>
                            <img
                                src={incomingCallState?.callType === 'video' ? assets.videoCallIcon : assets.audioCallIcon}
                                alt="call icon"
                                className="w-6 h-6"
                            />

                            {incomingCallState?.callType === 'video'
                                ? 'Video Call'
                                : 'Audio Call'}
                        </p>
                        <div className='flex gap-4 sm:gap-6 mt-1 sm:mt-2'>
                            <button onClick={acceptCall} className='w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 flex items-center justify-center text-xl sm:text-2xl'>✅</button>
                            <button onClick={rejectCall} className='w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 flex items-center justify-center text-xl sm:text-2xl'>❌</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DoctorVideoCall