import React, { useState, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'

const VoiceChat = ({ onTranscript, onSpeak }) => {
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const recognitionRef = useRef(null)


   const startListening = () => {
    if (isListening) return 

    recognitionRef.current?.stop()

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
        alert('Your browser does not support voice recognition. Please use Google Chrome.')
        return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    let hasProcessed = false

    recognition.onstart = () => {
        setIsListening(true)
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
    }

    recognition.onresult = (event) => {
        if (hasProcessed) return

        const result = event.results[0]

    
        if (!result.isFinal) return

        hasProcessed = true

        const transcript = result[0].transcript

        onTranscript({
            text: transcript,
            lang: 'en'
        })

        
        recognition.stop()
    }

    recognition.onend = () => {
        setIsListening(false)
        recognitionRef.current = null   
    }

    recognition.onerror = (event) => {
        console.log('Voice error:', event.error)
        setIsListening(false)
        recognitionRef.current = null
    }

    recognition.start()
}




    const stopListening = () => {
        recognitionRef.current?.stop()
        setIsListening(false)
    }


    const speakText = (text) => {
        if (!window.speechSynthesis) return

        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'

        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        window.speechSynthesis.speak(utterance)
    }
    const stopSpeaking = () => {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
    }


    React.useEffect(() => {
        if (onSpeak) {
            onSpeak(speakText)
        }
    }, [onSpeak])


    return (
        <div className='flex items-center gap-2'>

            <button
                onClick={isListening ? stopListening : startListening}
                title={isListening ? 'Stop recording' : 'Start voice input'}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening
                    ? 'bg-red-500 animate-pulse shadow-md shadow-red-300'
                    : 'bg-gray-100 hover:bg-gray-200'
                    }`}
            >
                <img
                    src={isListening ? assets.stopIcon : assets.micIcon}
                    alt="voice"
                    className="w-5 h-5"
                />
            </button>

            {/* 🔊 Speaker Button — AI reply */}
            {isSpeaking && (
                <button
                    onClick={stopSpeaking}
                    title='Stop speaking'
                    className='w-9 h-9 rounded-full flex items-center justify-center bg-indigo-100 hover:bg-indigo-200 transition animate-pulse'
                >
                    <img
                        src={assets.speakerIcon}
                        alt="speaker"
                        className='w-5 h-5'
                    />
                </button>
            )}

            {/* Status Text */}
            {isListening && (
                <span className='text-xs text-red-500 flex items-center gap-2 animate-pulse'>
                    <img
                        src={assets.micIcon}
                        alt="listening"
                        className="w-3.5 h-3.5 opacity-80"
                    />
                    Listening...
                </span>
            )}
            {isSpeaking && (
                <span className='text-xs text-indigo-500 flex items-center gap-2'>
                    <img
                        src={assets.speakerIcon}
                        alt="speaking"
                        className='w-4 h-4'
                    />
                    Speaking...
                </span>
            )}
        </div>
    )
}

export default VoiceChat