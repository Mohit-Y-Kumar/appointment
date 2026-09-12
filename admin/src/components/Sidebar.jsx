import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext'
import { assets } from '../assets/assets'
import { NavLink } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext'

const Sidebar = () => {
  const { aToken } = useContext(AdminContext)
  const { dToken } = useContext(DoctorContext)

  const adminLinks = [
    { to: '/admin-dashboard',  icon: assets.home_icon,        label: 'Dashboard'    },
    { to: '/all-appointments', icon: assets.appointment_icon, label: 'Appointments' },
    { to: '/add-doctor',       icon: assets.add_icon,         label: 'Add Doctor'   },
    { to: '/doctor-list',      icon: assets.people_icon,      label: 'Doctor List'  },
  ]

  const doctorLinks = [
    { to: '/doctor-dashboard',    icon: assets.home_icon,        label: 'Dashboard'    },
    { to: '/doctor-appointments', icon: assets.appointment_icon, label: 'Appointments' },
    { to: '/doctor-profile',      icon: assets.people_icon,      label: 'Profile'      },
  ]

  const links = aToken ? adminLinks : dToken ? doctorLinks : []

  return (
    <aside className='fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-16 flex-col border-r border-slate-200/80 bg-slate-950/95 shadow-[8px_0_30px_rgba(15,23,42,0.18)] backdrop-blur-md md:w-60'>

      {/* Logo + Role zone */}
      <div className='px-3 md:px-4 py-5 border-b border-white/10'>
        <div className='flex items-center gap-3'>
          <div className='relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-blue-600 to-cyan-500 shadow-[0_10px_18px_rgba(59,130,246,0.35)] ring-1 ring-white/20 shrink-0'>
            <div className='absolute h-4 w-1 rounded-full bg-white' />
            <div className='absolute h-1 w-4 rounded-full bg-white' />
            <span className='absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400' />
          </div>
          <div className='hidden md:block'>
            <span className='block text-lg font-bold tracking-tight text-white'>
              <span className='text-indigo-400'>Doc</span>Nest
            </span>
            <span className='block text-[9px] font-medium uppercase tracking-[0.28em] text-slate-400'>Healthcare</span>
          </div>
        </div>

        <div className='hidden md:inline-flex mt-4 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5'>
          <span className='h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' />
          <span className='text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-300'>
            {aToken ? 'Admin Panel' : 'Doctor Panel'}
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className='mt-4 flex flex-1 flex-col gap-1.5 px-2 md:px-3'>
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-2xl px-2.5 py-2.5 md:px-3.5 transition-all duration-200 ease-out
               justify-center md:justify-start
               ${isActive
                 ? 'bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-[0_12px_18px_rgba(79,70,229,0.35)]'
                 : 'text-slate-300 hover:bg-white/6 hover:text-white'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`absolute left-0 top-2 h-6 w-1 rounded-full ${isActive ? 'bg-white/80' : 'bg-transparent group-hover:bg-white/25'}`} />
                <img
                  src={icon}
                  alt=''
                  className='h-4 w-4 shrink-0 transition-all'
                  style={{ filter: isActive ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.7)' }}
                />
                <p className='hidden text-sm font-medium md:block'>{label}</p>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className='hidden border-t border-white/10 px-3 py-4 md:block'>
        <div className='rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-slate-400'>
          Secure access
        </div>
      </div>
    </aside>
  )
}

export default Sidebar