import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import { assets } from '../../assets/assets'
import address from '../../assets/address.svg'
import edit from '../../assets/edit.svg'
import axios from 'axios'


const DoctorProfile = () => {

  const {
    dToken,
    profileData,
    setProfileData,
    getProfileData, backendUrl
  } = useContext(DoctorContext)
  const { currency } = useContext(AppContext)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (dToken) {
      getProfileData()
    }
  }, [dToken])

  const updateProfile = async () => {
    try {
      setSaving(true)

      const { data } = await axios.post(
        backendUrl + '/api/doctor/update-profile',
        {
          address: profileData.address,
          fees: profileData.fees,
          available: profileData.available
        },
        {
          withCredentials: true
        }
      )

      if (data.success) {
        toast.success(data.message)
        setIsEdit(false)
        getProfileData()
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }



  if (!profileData) {
    return <div className="ml-0 md:ml-64 p-5">Loading...</div>
  }
  return profileData && (

    <div className='m-5    space-y-5  min-h-screen'>

      {/*  Profile Card  */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>

        {/* Banner */}
        <div className='h-6 sm:h-12 bg-linear-to-r from-primary to-teal-500 relative'>
          <div className='absolute inset-0 opacity-10'
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
        </div>

        {/* Avatar */}
        <div className='px-4 py-14 sm:px-6 md:px-8 sm pb-6'>
          <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5'>
            <div className='flex items-end gap-3 sm:gap-4 -mt-8 sm:-mt-10'>
              <img
                className='w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-white shadow-md ring-2 ring-[#eef0ff] shrink-0'
                src={profileData.image}
                alt={profileData.name}
              />
              <div className='mb-1 min-w-0'>
                <h2 className='text-base sm:text-xl md:text-2xl font-bold text-[#1A1F5E] leading-tight truncate'>{profileData.name}</h2>
                <p className='text-xs sm:text-sm text-gray-500 mt-0.5 truncate'>{profileData.degree} · {profileData.speciality}</p>
                <span className='inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef0ff] text-[#5F6FFF] whitespace-nowrap'>
                  {profileData.experience}
                </span>
              </div>
            </div>

            {/* Edit / Save button */}
            <div className='flex flex-row gap-2 w-full sm:w-auto'>
              {isEdit ? (
                <>
                  <button
                    onClick={() => setIsEdit(false)}
                    className='flex-1 sm:flex-none px-4 py-2 text-sm rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateProfile}
                    disabled={saving}
                    className='flex-1 sm:flex-none px-5 py-2 text-sm rounded-full bg-[#5F6FFF] text-white font-semibold hover:bg-[#4a5aee] transition disabled:opacity-60'
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEdit(true)}
                  className='w-full sm:w-auto px-5 py-2 text-sm rounded-full border-2 border-[#5F6FFF] text-[#5F6FFF] font-semibold hover:bg-[#5F6FFF] hover:text-white transition flex items-center justify-center gap-2'
                >
                  <img src={edit} className='w-4 h-4' alt="edit" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* About */}
          <div className='mb-5'>
            <p className='text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5'>About</p>
            <p className='text-sm text-gray-600 leading-relaxed max-w-2xl'>{profileData.about}</p>
          </div>

          
          <div className='border-t border-gray-100 my-5' />

          {/* Info Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5'>


            {/* Consultation Fee */}
            <div>
              <p className='text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2'>Consultation Fee</p>
              <div className='flex items-center gap-2'>
                <span className='w-8 h-8 rounded-lg bg-[#eef0ff] flex items-center justify-center text-sm'><img src={assets.earning_icon} alt="" /></span>
                {isEdit ? (
                  <input
                    type='number'
                    value={profileData.fees}
                    onChange={e => setProfileData(prev => ({ ...prev, fees: e.target.value }))}
                    className='border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-32 focus:outline-none focus:border-[#5F6FFF] focus:ring-1 focus:ring-[#5F6FFF]'
                  />
                ) : (
                  <span className='text-lg font-bold text-[#1A1F5E]'>{currency}{profileData.fees}</span>
                )}
              </div>
            </div>

            {/* Availability */}
            <div>
              <p className='text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2'>Availability</p>
              <label className={`inline-flex items-center gap-3 cursor-pointer px-4 py-2 rounded-xl border-2 transition-all ${profileData.available ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className='relative'>
                  <input
                    type='checkbox'
                    checked={profileData.available}
                    onChange={() => isEdit && setProfileData(prev => ({ ...prev, available: !prev.available }))}
                    className='sr-only'
                    disabled={!isEdit}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${profileData.available ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileData.available ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className={`text-sm font-semibold ${profileData.available ? 'text-green-600' : 'text-gray-400'}`}>
                  {profileData.available ? 'Available for Booking' : 'Not Available'}
                </span>
              </label>
              {!isEdit && (
                <p className='text-xs text-gray-400 mt-1.5'>Enable edit mode to change availability</p>
              )}
            </div>

            {/* Address Line 1 */}
            <div>
              <p className='text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2'>Address Line 1</p>
              <div className='flex items-center gap-2'>
                <span className='w-8 h-8 rounded-lg bg-[#eef0ff] flex items-center justify-center text-sm shrink-0'><img className='bg-blue-300 rounded-sm' src={address} alt="" /></span>
                {isEdit ? (
                  <input
                    type='text'
                    value={profileData.address?.line1 || ""}
                    onChange={e => setProfileData(prev => ({ ...prev, address: { ...(prev.address || {}), line1: e.target.value } }))}
                    className='border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:border-[#5F6FFF] focus:ring-1 focus:ring-[#5F6FFF]'
                  />
                ) : (
                  <span className='text-sm text-gray-700'>{profileData.address?.line1}</span>
                )}
              </div>
            </div>

            {/* Address Line 2 */}
            <div>
              <p className='text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2'>Address Line 2</p>
              <div className='flex items-center gap-2'>
                <span className='w-8 h-8 rounded-lg bg-[#eef0ff] flex items-center justify-center text-sm shrink-0'><img className='bg-blue-300  rounded-sm' src={address} alt="" /></span>
                {isEdit ? (
                  <input
                    type='text'
                    value={profileData.address?.line2 || ""}
                    onChange={e => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                    className='border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:border-[#5F6FFF] focus:ring-1 focus:ring-[#5F6FFF]'
                  />
                ) : (
                  <span className='text-sm text-gray-700'>{profileData.address?.line2 || '—'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorProfile
