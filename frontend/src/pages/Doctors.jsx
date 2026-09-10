import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import DoctorCard from '../components/DoctorCard'
import { assets } from '../assets/assets'

const SPECIALITIES = [
  'General physician',
  'Gynecologist',
  'Dermatologist',
  'Pediatricians',
  'Neurologist',
  'Gastroenterologist',
]

const Doctors = () => {
  const { speciality } = useParams()
  const { doctors, backendUrl, token } = useContext(AppContext)
  const navigate = useNavigate()

  const [filterDoc, setFilterDoc] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const [likedDoctors, setLikedDoctors] = useState({})
  const [search, setSearch] = useState('')

  // base filter — speciality only
  useEffect(() => {
    if (speciality) {
      setFilterDoc(doctors.filter(d => d.speciality === speciality))
    } else {
      setFilterDoc(doctors)
    }
  }, [doctors, speciality])

  // search filter on top of speciality filter
  const displayDocs = search.trim()
    ? filterDoc.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.speciality.toLowerCase().includes(search.toLowerCase())
    )
    : filterDoc

  const handleCardClick = async (docId) => {
    try {
      await axios.post(`${backendUrl}/api/doctor/view/${docId}`)
    } catch (err) {
      console.error('[Doctors] view track:', err.message)
    }
    navigate(`/appointment/${docId}`)
  }

  const handleLike = async (e, docId) => {
    e.stopPropagation()
    if (!token) { toast.warn('Please login to like a doctor'); return }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/like/${docId}`,
        {},
        { withCredentials: true }
      )
      if (data.success) {
        setLikedDoctors(prev => ({ ...prev, [docId]: data.liked }))
        setFilterDoc(prev => prev.map(d =>
          d._id === docId
            ? { ...d, likes: data.liked ? (d.likes || 0) + 1 : (d.likes || 1) - 1 }
            : d
        ))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const toggleSpeciality = (sp) => {
    if (speciality === sp) navigate('/doctors')
    else navigate(`/doctors/${sp}`)
    setShowFilter(false)
  }

  const clearSearch = () => setSearch('')

  return (
    <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
      <p className='text-gray-500 text-sm mb-4'>Browse through the doctors specialists.</p>

      {/* ── Search bar ── */}
      <div className='relative mb-5'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
          <img src={assets.lenseIcon} className='h-4 w-4' alt="" />
        </span>
        <input
          type='text'
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search by name or speciality…'
          className='w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl
            bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300
            focus:border-indigo-400 transition-all placeholder-gray-400 text-gray-700'
        />
        {search && (
          <button
            onClick={clearSearch}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
              hover:text-gray-600 transition-colors'
          >
            <img src={assets.crossIcon}  className='h-4 w-4 invert' alt="" />

          </button>
        )}
      </div>

      <div className='flex flex-col sm:flex-row items-start gap-5'>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFilter(p => !p)}
          className={`sm:hidden py-1.5 px-4 border rounded-full text-sm transition-all font-medium
            ${showFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-300'}`}
        >
          {showFilter ? 'Hide Filters' : 'Filters'}
        </button>

        {/* Speciality sidebar */}
        <div className={`flex-col gap-2 text-sm ${showFilter ? 'flex' : 'hidden sm:flex'} w-full sm:w-auto`}>
          {SPECIALITIES.map(sp => (
            <button
              key={sp}
              onClick={() => toggleSpeciality(sp)}
              className={`w-full sm:w-52 text-left pl-3 py-2 pr-4 border rounded-lg transition-all cursor-pointer text-sm
                ${speciality === sp
                  ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'}`}
            >
              {sp}
            </button>
          ))}
        </div>

        {/* Doctor grid */}
        <div className='flex-1 w-full'>

          {/* result count */}
          {search.trim() && (
            <p className='text-xs text-gray-400 mb-3'>
              {displayDocs.length === 0
                ? `No results for "${search}"`
                : `${displayDocs.length} result${displayDocs.length !== 1 ? 's' : ''} for "${search}"`}
            </p>
          )}

          {displayDocs.length === 0 ? (
            <p className='text-gray-400 text-sm mt-4'>
              {search.trim()
                ? `No doctors found matching "${search}".`
                : speciality
                  ? `No doctors found for "${speciality}".`
                  : 'No doctors available.'}
            </p>
          ) : (
            <div className='grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3'>
              {displayDocs.map((item) => (
                <DoctorCard
                  key={item._id}
                  item={item}
                  liked={!!likedDoctors[item._id]}
                  onCardClick={() => handleCardClick(item._id)}
                  onLike={(e) => handleLike(e, item._id)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Doctors