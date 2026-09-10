import React from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { fmtR } from '../utils/DashboardUtils'
import { MetricCard, SectionLabel } from './DashboardWidgets'

const OverviewCards = ({ dashData, doctors, stats }) => {
  const navigate = useNavigate()

  return (
    <>
      <SectionLabel>Overview</SectionLabel>
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-4'>
        <MetricCard
          icon={{ emoji: assets.regIcon, bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}
          label='Registered Doctors'
          value={dashData.doctors}
          sub={`${(doctors || []).filter(d => d.available).length} available now`}
          onClick={() => navigate('/doctor-list')}
        />
        <MetricCard
          icon={{ emoji: assets.TotalAppIcon, bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}
          label='Total Appointments'
          value={dashData.appointments}
          sub={`+${stats.bookedToday || 0} booked today`}
          onClick={() => navigate('/all-appointments')}
        />
        <MetricCard
          icon={{ emoji: assets.regUserIcon, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}
          label='Total Patients'
          value={dashData.patients}
          sub='Registered users'
        />
        <MetricCard
          icon={{ emoji: assets.pendingIcon, bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}
          label='Pending'
          value={stats.pending || 0}
          sub='Awaiting confirmation'
          subColor='text-amber-600'
          onClick={() => navigate('/all-appointments')}
        />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-2'>
        <MetricCard
          icon={{ emoji: assets.collIcon, bg: 'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)' }}
          label='Total Revenue'
          value={fmtR(stats.revenue || 0)}
          sub='From paid appointments'
          subColor='text-indigo-600'
        />
        <MetricCard
          icon={{ emoji: assets.appCancelIcon, bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}
          label='Cancelled Today'
          value={stats.cancelledToday || 0}
          sub='Monitor trend'
          subColor='text-red-500'
        />
        <MetricCard
          icon={{ emoji: assets.filledStar, bg: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)' }}
          label='Avg Doctor Rating'
          value={stats.avgRating || 'N/A'}
          sub='Across all doctors'
          subColor='text-amber-600'
        />
        <MetricCard
          icon={{ emoji: assets.appCompIcon, bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}
          label='Completed'
          value={stats.completed || 0}
          sub='All time'
          subColor='text-emerald-600'
        />
      </div>
    </>
  )
}

export default OverviewCards
