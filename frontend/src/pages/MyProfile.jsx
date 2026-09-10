import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const MyProfile = () => {
  const { userData, setUserData, backendUrl, loadUserProfileData } = useContext(AppContext)

  const [isEdit, setIsEdit] = useState(false)
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const updateUserProfileData = async () => {
    console.log('Gender being sent:', userData.gender)  // ye add karo
    console.log('DOB being sent:', userData.dob)
    if (loading) return
    if (!userData.gender || userData.gender === 'Not Selected') {
      return toast.error('Please select your gender.')
    }
    if (!userData.dob || userData.dob === 'Not Selected') {
      return toast.error('Please select your date of birth.')
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', userData.name)
      formData.append('phone', userData.phone)
      formData.append('address', JSON.stringify(userData.address))
      formData.append('gender', userData.gender)
      formData.append('dob', userData.dob)
      if (image) formData.append('image', image)

      const { data } = await axios.post(
        backendUrl + '/api/user/update-profile',
        formData,
        { withCredentials: true }
      )

      if (data.success) {
        toast.success(data.message)
        await loadUserProfileData()
        setIsEdit(false)
        setImage(null)
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Update failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!userData) return (
    <div className='min-h-[60vh] flex items-center justify-center'>
      <p className='text-gray-400'>Loading profile...</p>
    </div>
  )

  return (
    <div className='mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8'>
      <div className='bg-white shadow-xl rounded-2xl p-6 sm:p-10'>

        {/* HEADER */}
        <div className='flex flex-col sm:flex-row items-center gap-5 sm:gap-8'>
          {isEdit ? (
            <label htmlFor='profile-image' className='cursor-pointer shrink-0'>
              <div className='relative w-28 h-28 sm:w-32 sm:h-32'>
                <img
                  className='w-full h-full rounded-full object-cover border-4 border-gray-200'
                  src={image ? URL.createObjectURL(image) : userData.image}
                  alt='Profile'
                />
                <div className='absolute bottom-1 right-1 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full'>
                  Change
                </div>
              </div>
              <input
                type='file'
                id='profile-image'
                hidden
                accept='image/*'
                onChange={e => setImage(e.target.files[0] || null)}
              />
            </label>
          ) : (
            <img
              className='w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-200 shrink-0'
              src={userData.image}
              alt='Profile'
            />
          )}

          <div className='text-center sm:text-left w-full min-w-0'>
            {isEdit ? (
              <input
                className='text-xl sm:text-2xl font-semibold border-b border-gray-300 outline-none w-full pb-1
                  focus:border-indigo-400 transition bg-transparent'
                value={userData.name}
                onChange={e => setUserData(prev => ({ ...prev, name: e.target.value }))}
              />
            ) : (
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 truncate'>{userData.name}</h2>
            )}
            <p className='text-gray-400 text-sm mt-1 truncate'>{userData.email}</p>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className='mt-8'>
          <h3 className='text-base sm:text-lg font-semibold text-gray-700 border-b pb-2'>
            Contact Information
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4'>

            <div>
              <label className='text-xs text-gray-400 uppercase tracking-wide'>Phone</label>
              {isEdit ? (
                <input
                  type='tel'
                  className='w-full border rounded-lg px-3 py-2 mt-1 bg-gray-50 text-sm
                    focus:outline-none focus:border-indigo-400 transition'
                  value={userData.phone}
                  onChange={e => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                />
              ) : (
                <p className='text-gray-700 mt-1 text-sm'>{userData.phone || '—'}</p>
              )}
            </div>

            <div>
              <label className='text-xs text-gray-400 uppercase tracking-wide'>Address</label>
              {isEdit ? (
                <div className='flex flex-col gap-2 mt-1'>
                  <input
                    className='w-full border rounded-lg px-3 py-2 bg-gray-50 text-sm
                      focus:outline-none focus:border-indigo-400 transition'
                    placeholder='Line 1'
                    value={userData.address?.line1 || ''}
                    onChange={e => setUserData(prev => ({
                      ...prev, address: { ...prev.address, line1: e.target.value }
                    }))}
                  />
                  <input
                    className='w-full border rounded-lg px-3 py-2 bg-gray-50 text-sm
                      focus:outline-none focus:border-indigo-400 transition'
                    placeholder='Line 2'
                    value={userData.address?.line2 || ''}
                    onChange={e => setUserData(prev => ({
                      ...prev, address: { ...prev.address, line2: e.target.value }
                    }))}
                  />
                </div>
              ) : (
                <p className='text-gray-700 mt-1 text-sm leading-6'>
                  {userData.address?.line1 || '—'}<br />
                  {userData.address?.line2}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* BASIC INFO */}
        <div className='mt-8'>
          <h3 className='text-base sm:text-lg font-semibold text-gray-700 border-b pb-2'>
            Basic Information
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4'>

            <div>
              <label className='text-xs text-gray-400 uppercase tracking-wide'>Gender</label>
              {isEdit ? (
                <select
                  className='w-full border rounded-lg px-3 py-2 mt-1 bg-gray-50 text-sm
      focus:outline-none focus:border-indigo-400 transition'
                  value={userData.gender || 'Not Selected'}
                  onChange={e => {
                    const selected = e.target.value
                    setUserData(prev => ({ ...prev, gender: selected }))
                  }}
                >
                  <option value='Not Selected' disabled>Select Gender</option>
                  <option value='Male'>Male</option>
                  <option value='Female'>Female</option>
                  <option value='Other'>Other</option>
                </select>
              ) : (
                <p className='text-gray-700 mt-1 text-sm'>{userData.gender || '—'}</p>
              )}
            </div>

            <div>
              <label className='text-xs text-gray-400 uppercase tracking-wide'>Date of Birth</label>
              {isEdit ? (
                <input
                  type='date'
                  className='w-full border rounded-lg px-3 py-2 mt-1 bg-gray-50 text-sm
                    focus:outline-none focus:border-indigo-400 transition'
                  value={userData.dob?.substring(0, 10) || ''}
                  onChange={e => {
                    const selected = e.target.value
                    setUserData(prev => ({ ...prev, dob: selected }))
                  }}
                />
              ) : (
                <p className='text-gray-700 mt-1 text-sm'>{userData.dob?.substring(0, 10) || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className='mt-10 flex flex-col sm:flex-row items-center justify-center gap-3'>
          {isEdit ? (
            <>
              <button
                onClick={updateUserProfileData}
                disabled={loading}
                className='w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-full
                  transition font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2'
              >
                {loading && (
                  <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24' fill='none'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
                  </svg>
                )}
                Save Changes
              </button>
              <button
                onClick={() => { setIsEdit(false); setImage(null) }}
                disabled={loading}
                className='w-full sm:w-auto border border-gray-300 text-gray-500 px-8 py-2.5 rounded-full
                  hover:bg-gray-50 transition text-sm disabled:opacity-60'
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEdit(true)}
              className='w-full sm:w-auto border border-indigo-500 text-indigo-600 px-8 py-2.5 rounded-full
                hover:bg-indigo-600 hover:text-white transition font-medium text-sm'
            >
              Edit Profile
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default MyProfile