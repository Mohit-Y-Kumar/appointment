import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { useDashboardStats } from '../../utils/DashboardStats'
import OverviewCards       from '../../components/OverviewCards'
import AppointmentCharts   from '../../components/AppointmentCharts'
import RevenueCharts       from '../../components/RevenueCharts'
import DoctorPatientCharts from '../../components/DoctorPatientCharts'
import RecentActivity      from '../../components/RecentActivity'

const Dashboard = () => {
  const {
    aToken, getDashData, dashData,
    getAllAppointments, appointments,
    getAllDoctors, doctors,
  } = useContext(AdminContext)

  useEffect(() => {
    if (aToken) {
      getDashData()
      getAllAppointments()
      getAllDoctors()
    }
  }, [aToken])

  const stats = useDashboardStats(appointments, doctors)

  if (!dashData) {
    return (
      <div className='flex items-center justify-center h-[60vh]'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin' />
          <p className='text-slate-400 text-sm'>Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto mt-5 w-full max-w-[1400px] p-4 sm:p-5 md:p-6 lg:p-7'>

      {/* Top bar */}
      <div className='mb-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)] backdrop-blur-sm'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h1 className='text-xl font-bold tracking-tight text-slate-800'>Admin Dashboard</h1>
            <p className='text-xs text-slate-500 mt-1'>
              DocNest &nbsp;·&nbsp;
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className='rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600'>
            Live
          </div>
        </div>
      </div>

      <OverviewCards
        dashData={dashData}
        doctors={doctors}
        stats={stats}
      />

      <AppointmentCharts stats={stats} />

      <RevenueCharts stats={stats} />

      <DoctorPatientCharts
        stats={stats}
        dashData={dashData}
        doctors={doctors}
      />

      <RecentActivity
        dashData={dashData}
        doctors={doctors}
      />

    </div>
  )
}

export default Dashboard
