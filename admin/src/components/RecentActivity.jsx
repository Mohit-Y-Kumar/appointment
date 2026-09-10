import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import { card } from '../utils/DashboardUtils'
import { SectionLabel } from '../components/DashboardWidgets'

const RecentActivity = ({ dashData, doctors }) => {
  const { cancelAppointment } = useContext(AdminContext)
  const { slotDateFormat }    = useContext(AppContext)
  const navigate              = useNavigate()

  const bgs = ['#ede9fe', '#d1fae5', '#fee2e2', '#e0f2fe', '#fef9c3']
  const txs = ['#5b21b6', '#065f46', '#991b1b', '#0c4a6e', '#78350f']

  return (
    <>
      <SectionLabel>Recent Activity</SectionLabel>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3'>

        {/* Recent Appointments */}
        <div className={card}>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <p className='text-sm font-semibold text-slate-700'>Recent Appointments</p>
              <p className='text-xs text-slate-400'>Latest bookings across platform</p>
            </div>
            <button onClick={() => navigate('/all-appointments')}
              className='text-xs text-primary hover:text-blue-700 font-medium'>View all →</button>
          </div>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-slate-100'>
                {['Patient', 'Doctor', 'Date', 'Status', ''].map(h => (
                  <th key={h} className='text-left text-slate-400 font-medium pb-2 pr-2'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(dashData.latestAppointments || []).map((item, i) => {
                const initials = (item.userData?.name || 'U')
                  .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <tr key={i} className='border-b border-slate-50 hover:bg-slate-50'>
                    <td className='py-2 pr-2'>
                      <div className='flex items-center gap-2'>
                        <div className='w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0'
                          style={{ background: bgs[i % 5], color: txs[i % 5] }}>{initials}</div>
                        <span className='text-slate-700 font-medium truncate max-w-17.5'>
                          {(item.userData?.name || 'Patient').split(' ')[0]}
                        </span>
                      </div>
                    </td>
                    <td className='py-2 pr-2 text-slate-500 truncate max-w-20'>{item.docData?.name}</td>
                    <td className='py-2 pr-2 text-slate-400 whitespace-nowrap'>{slotDateFormat(item.slotDate)}</td>
                    <td className='py-2 pr-2'>
                      {item.cancelled
                        ? <span className='px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium text-[10px]'>Cancelled</span>
                        : item.isCompleted
                          ? <span className='px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium text-[10px]'>Completed</span>
                          : item.payment
                            ? <span className='px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium text-[10px]'>Confirmed</span>
                            : <span className='px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium text-[10px]'>Pending</span>
                      }
                    </td>
                    <td className='py-2 text-right'>
                      {!item.cancelled && !item.isCompleted && (
                        <button onClick={() => cancelAppointment(item._id)}
                          className='text-[10px] text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50'>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Doctor Overview */}
        <div className={card}>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <p className='text-sm font-semibold text-slate-700'>Doctor Overview</p>
              <p className='text-xs text-slate-400'>Registered doctors at a glance</p>
            </div>
            <button onClick={() => navigate('/doctor-list')}
              className='text-xs text-primary hover:text-blue-700 font-medium'>View all →</button>
          </div>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-slate-100'>
                {['Doctor', 'Speciality', 'Rating', 'Status'].map(h => (
                  <th key={h} className='text-left text-slate-400 font-medium pb-2 pr-2'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(doctors || []).slice(0, 5).map((doc, i) => (
                <tr key={i} className='border-b border-slate-50 hover:bg-slate-50'>
                  <td className='py-2 pr-2'>
                    <div className='flex items-center gap-2'>
                      <img src={doc.image} alt='' className='w-6 h-6 rounded-full object-cover shrink-0' />
                      <span className='text-slate-700 font-medium truncate max-w-17.5'>
                        {doc.name.replace('Dr. ', '')}
                      </span>
                    </div>
                  </td>
                  <td className='py-2 pr-2 text-slate-500 truncate max-w-17.5'>{doc.speciality}</td>
                  <td className='py-2 pr-2 text-amber-600 font-medium'>
                    {doc.averageRating > 0 ? (
                      <div className='flex items-center gap-1'>
                        <img src={assets.filledStar} alt='star' className='w-4 h-4' />
                        <span>{doc.averageRating.toFixed(1)}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className='py-2'>
                    {doc.available
                      ? <span className='px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium text-[10px]'>Available</span>
                      : <span className='px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]'>Unavailable</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default RecentActivity
