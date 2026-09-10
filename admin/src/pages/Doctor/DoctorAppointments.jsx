import React, { useContext, useState, useEffect } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import DoctorChat from './DoctorChat'
import chaticon from '../../assets/chats_icon.svg'

const DoctorAppointments = () => {

  const { dToken, appointments, appointmentPagination, getAppointments, completeAppointment, cancelAppointment } = useContext(DoctorContext)
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext)

  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (dToken) {
      getAppointments()
    }
  }, [dToken])

  const filtered = appointments.filter(a => {
    if (filter === 'pending') return !a.cancelled && !a.isCompleted
    if (filter === 'completed') return a.isCompleted
    if (filter === 'cancelled') return a.cancelled
    return true
  })
  const counts = {
    all: appointments.length,
    pending: appointments.filter(a => !a.cancelled && !a.isCompleted).length,
    completed: appointments.filter(a => a.isCompleted).length,
    cancelled: appointments.filter(a => a.cancelled).length,
  }

  const filterTabs = [
    { key: 'all', label: 'All', color: 'bg-[#5F6FFF] text-white', inactive: 'text-[#5F6FFF] bg-[#eef0ff]' },
    { key: 'pending', label: 'Pending', color: 'bg-amber-500 text-white', inactive: 'text-amber-600 bg-amber-50' },
    { key: 'completed', label: 'Completed', color: 'bg-green-500 text-white', inactive: 'text-green-600 bg-green-50' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500 text-white', inactive: 'text-red-500 bg-red-50' },
  ]
  return (
    <div className='m-3 sm:m-5 space-y-4 sm:space-y-5'>

      {/*  Page Title */}
      <div className='  flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold text-brand-dark'>All Appointments</h1>
          <p className='text-xs text-gray-400 mt-0.5'>{appointmentPagination.total} total records</p>
        </div>

        {/* Filter Tabs */}
        <div className='flex flex-wrap gap-2 overflow-x-auto pb-1'>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${filter === tab.key ? tab.color : tab.inactive}`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === tab.key ? 'bg-white/25' : 'bg-white'}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>

        <div className='hidden xl:grid grid-cols-[0.4fr_2fr_1fr_0.7fr_2.2fr_1fr_1fr_0.8fr] gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider'>
          <span>#</span>
          <span>Patient</span>
          <span>Payment</span>
          <span>Age</span>
          <span>Date & Time</span>
          <span>Fees</span>
          <span>Action</span>
          <span>Chat</span>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <div className='w-14 h-14 rounded-full bg-[#eef0ff] flex items-center justify-center mb-3'>
              <img className='w-7' src={assets.appointments_icon} alt='' />
            </div>
            <p className='text-sm font-medium text-gray-500'>No {filter} appointments</p>
            <p className='text-xs text-gray-400 mt-1'>Try a different filter</p>
          </div>
        )}

        {/* Rows */}
        <div className='divide-y divide-gray-50 max-h-[65vh] overflow-y-auto'>
          {filtered.slice().reverse().map((item, index) => (
            <div
              key={index}
              className='flex flex-col gap-3 xl:grid xl:grid-cols-[0.4fr_2fr_1fr_0.7fr_2.2fr_1fr_1fr_0.8fr] xl:gap-2 items-start xl:items-center px-4 sm:px-5 py-4 hover:bg-[#f9f9ff] transition-colors'
            >
              {/* Index */}
              <p className='hidden lg:block text-sm text-gray-400 font-medium'>{index + 1}</p>

              {/* Patient */}
              <div className='flex items-center gap-3'>
                <img
                  className='w-9 h-9 rounded-full object-cover ring-2 ring-indigo-50 shrink-0'
                  src={item.userData.image}
                  alt=''
                />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-gray-800 truncate'>{item.userData.name}</p>
                  <p className='text-xs text-gray-400 xl:hidden'>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
                </div>
              </div>

              {/* Payment */}
              <div className='flex flex-wrap items-center gap-2 xl:contents'>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.payment ? 'bg-indigo-50 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                  {item.payment ? 'Online' : 'Cash'}
                </span>
              </div>

              {/* Age */}
              <span className='text-xs text-gray-500 px-2.5 py-1 rounded-full bg-gray-50'>
                {calculateAge(item.userData.dob)} yrs
              </span>

              {/* Date */}
              <p className='hidden xl:block text-sm text-gray-500'>
                {slotDateFormat(item.slotDate)}, <span className='font-medium text-gray-700'>{item.slotTime}</span>
              </p>

              {/* Fees */}
              <p className='text-sm font-semibold text-brand-dark'>{currency}{item.amount}</p>

              {/* Action */}
              <div>
                {item.cancelled ? (
                  <span className='text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-500'>Cancelled</span>
                ) : item.isCompleted ? (
                  <span className='text-xs font-semibold px-3 py-1 rounded-full bg-green-50 text-green-600'>Completed</span>
                ) : !item.payment ? (
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-600'>Awaiting payment</span>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      className='w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition'
                      title='Cancel'
                    >
                      <img className='w-4 h-4' src={assets.cancel_icon} alt='cancel' />
                    </button>
                  </div>
                  </div>
                ) : (
                  <button
                    onClick={() => completeAppointment(item._id)}
                    className='w-8 h-8 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center transition'
                    title='Complete'
                  >
                    <img className='w-4 h-4' src={assets.tick_icon} alt='complete' />
                  </button>
                )}
              </div>

              {/* Chat */}
              <button
                onClick={() => {
                  setSelectedPatient({
                    userId: item.userId,
                    name: item.userData.name,
                    image: item.userData.image,
                    docId: item.docId
                  })
                  setShowChat(true)
                }}
                className='flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-primary hover:bg-primary hover:text-white transition-all'
              >
                <img src={chaticon} alt="chat" className="w-4 h-4 text-blue-400S" /> Chat
              </button>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between border-t border-gray-100 px-4 sm:px-6 py-3 text-xs text-gray-500'>
          <span>Page {appointmentPagination.page} of {appointmentPagination.pages}</span>
          <div className='flex gap-2'>
            <button disabled={appointmentPagination.page <= 1} onClick={() => getAppointments(appointmentPagination.page - 1)} className='rounded border px-3 py-1 disabled:opacity-40'>Previous</button>
            <button disabled={appointmentPagination.page >= appointmentPagination.pages} onClick={() => getAppointments(appointmentPagination.page + 1)} className='rounded border px-3 py-1 disabled:opacity-40'>Next</button>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && selectedPatient && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4'>
          <div className='w-full sm:w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden'>
            <DoctorChat
              docId={selectedPatient.docId}
              patientId={selectedPatient.userId}
              patientName={selectedPatient.name}
              patientImage={selectedPatient.image}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorAppointments