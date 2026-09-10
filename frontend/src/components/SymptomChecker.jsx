import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

import { assets } from '../assets/assets'

const SymptomChecker = () => {
    const { backendUrl, doctors, token } = useContext(AppContext)
    const navigate = useNavigate()

    const [symptom, setSymptom] = useState('')
    const [loading, setLoading] = useState(false)
    const [aiReply, setAiReply] = useState('')
    const [suggestedDoctors, setSuggestedDoctors] = useState([])
    const [searched, setSearched] = useState(false)



    // Quick symptom buttons
    const quickSymptoms = [
        { label: 'Fever', text: 'I have a fever', icon: assets.feverIcon },
        { label: 'Headache', text: 'I have a headache', icon: assets.headacheIcon },
        { label: 'Stomach', text: 'I have stomach pain', icon: assets.stomachIcon },
        { label: 'Skin', text: 'I have a skin problem', icon: assets.skinIcon },
        { label: 'Child', text: 'My child has a fever', icon: assets.childIcon },
    ]

    const findDoctor = async (directSymptom = null) => {
        const query = directSymptom || symptom.trim()
        if (!query) return

        setLoading(true)
        setSearched(true)
        setSuggestedDoctors([])
        setAiReply('')

        if (!token) {
            setAiReply('Please log in to use the symptom checker.')
            toast.warn('Please log in to use the symptom checker.')
            setLoading(false)
            return
        }

        try {
            const { data } = await axios.post(
                backendUrl + '/api/chat/message',
                { message: query },
                { withCredentials: true }
            )

            if (data.success) {
                let reply = data.reply
                let speciality = null

                // SPECIALITY tag detect 
                if (reply.includes('SPECIALITY:')) {
                    const parts = reply.split('SPECIALITY:')
                    reply = parts[0].trim()
                    speciality = parts[1].trim()

                    // Doctors filter 
                    const filtered = doctors?.filter(
                        doc => doc.speciality === speciality
                    )
                    setSuggestedDoctors(filtered || [])
                }

                setAiReply(reply)
            }
        } catch (error) {
            const message = error?.response?.data?.message || 'Something went wrong. Please try again.'
            setAiReply(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='mx-4 md:mx-10 my-16'>

            {/* Heading */}
            <div className='text-center mb-8'>
                <h2 className='flex items-center justify-center gap-2 text-3xl md:text-4xl font-semibold text-gray-900'>
                    <img src={assets.lenseIcon} alt="search" className="w-14 h-14" />
                    <span>Symptom Checker</span>
                </h2>

                <p className='text-gray-500 text-sm mt-2'>
                    Enter your symptoms — we’ll suggest the most suitable doctor for you.
                </p>
            </div>

            {/* Search Box */}
            <div className='max-w-2xl mx-auto'>
                <div className='flex gap-2 mb-4'>
                    <input
                        type='text'
                        value={symptom}
                        onChange={(e) => setSymptom(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && findDoctor()}
                        placeholder="Enter your symptoms (e.g., headache, fever, stomach pain)"
                        className='flex-1 border border-gray-300 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-indigo-400 shadow-sm'
                    />
                    <button
                        onClick={() => findDoctor()}
                        disabled={loading || !symptom.trim()}
                        className='flex items-center justify-center gap-2 bg-linear-to-r from-primary to-accent text-white px-6 py-3 rounded-full text-sm font-medium disabled:opacity-50 hover:scale-105 transition-all duration-300'
                    >
                        <img
                            src={loading ? assets.loadingIcon : assets.lenseIcon}
                            alt="icon"
                            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                        />

                        <span>
                            {loading ? 'Finding doctors...' : 'Find Doctor'}
                        </span>
                    </button>
                </div>

                {/* Quick Symptoms */}
                <div className='flex flex-wrap gap-2 justify-center mb-6'>
                    {quickSymptoms.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setSymptom(s.text)
                                findDoctor(s.text)
                            }}
                            className='flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 transition'
                        >
                            <img src={s.icon} alt={s.label} className="w-4 h-4" />
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className='text-center mt-6'>
                    <div className='flex justify-center gap-1'>
                        <span className='w-3 h-3 bg-indigo-400 rounded-full animate-bounce' style={{ animationDelay: '0ms' }}></span>
                        <span className='w-3 h-3 bg-indigo-400 rounded-full animate-bounce' style={{ animationDelay: '150ms' }}></span>
                        <span className='w-3 h-3 bg-indigo-400 rounded-full animate-bounce' style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <p className='text-sm text-gray-400 mt-2'>Analyzing your symptoms to find the best doctor...</p>
                </div>
            )}

            {/* AI Reply */}
            {aiReply && !loading && (
                <div className='max-w-2xl mx-auto mt-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4'>
                    <p className='flex items-center gap-2 text-sm font-medium text-indigo-700 mb-1'>
                        <img src={assets.robotIcon} alt="AI" className="w-4 h-4" />
                        <span>AI Suggestion:</span>
                    </p>
                    <p className='text-sm text-gray-700 whitespace-pre-line'>{aiReply}</p>
                </div>
            )}

            {/* Suggested Doctors */}
            {suggestedDoctors.length > 0 && !loading && (
                <div className='mt-8'>
                    <h3 className='flex items-center justify-center gap-2 text-xl font-semibold text-gray-800 mb-4'>
                        <img src={assets.docIcon} alt="doctor" className="w-10 h-10" />
                        <span>AI Recommendation</span>
                    </h3>
                    <div className='grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] px-4 md:px-10'>
                        {suggestedDoctors.map((doc, index) => (
                            <div
                                key={index}
                                onClick={() => navigate(`/appointment/${doc._id}`)}
                                className='bg-white border border-indigo-100 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300'
                            >
                                <img
                                    src={doc.image}
                                    alt={doc.name}
                                    className='w-full h-40 object-cover bg-linear-to-r from-primary to-accent'
                                />
                                <div className='p-3'>
                                    <div className={`flex items-center gap-1 text-xs ${doc.available ? 'text-green-500' : 'text-gray-400'}`}>
                                        <span className={`w-2 h-2 rounded-full ${doc.available ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                        {doc.available ? 'Available' : 'Not Available'}
                                    </div>
                                    <div className='flex items-center justify-between mt-1'>
                                        <p className='font-medium text-gray-900 text-sm'>{doc.name}</p>
                                        <div className='flex items-center gap-1'>
                                            <span className='text-yellow-400 text-xs'>
                                                <img src={assets.filledStar} alt="star" className="w-4 h-4 inline" />
                                            </span>
                                            <span className='text-xs text-gray-500'>{doc.averageRating || '0.0'}</span>
                                        </div>
                                    </div>
                                    <p className='text-xs text-gray-500'>{doc.speciality}</p>
                                    <div className='flex items-center justify-between mt-2'>
                                        <p className='text-xs text-gray-600'>₹{doc.fees}</p>
                                        <button className='text-xs bg-indigo-600 text-white px-3 py-1 rounded-full'>
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No doctors found */}
            {searched && !loading && suggestedDoctors.length === 0 && aiReply && (
                <div className='text-center mt-4'>
                    <p className='text-gray-500 text-sm'>
                        No exact match found — 
                        <span
                            onClick={() => navigate('/doctors')}
                            className='text-indigo-600 cursor-pointer ml-1 underline'
                        >
                            View All Doctors
                        </span>
                    </p>
                </div>
            )}
        </div>
    )
}

export default SymptomChecker