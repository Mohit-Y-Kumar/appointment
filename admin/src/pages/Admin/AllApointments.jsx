import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

const AllAppointments = () => {
    const { aToken, appointments, appointmentPagination, getAllAppointments, cancelAppointment } = useContext(AdminContext)
    const { calculateAge, slotDateFormat, currency } = useContext(AppContext)

    const [search,     setSearch]     = useState('')
    const [filter,     setFilter]     = useState('all')
    const [cancelling, setCancelling] = useState(null)

    useEffect(() => {
        if (aToken) getAllAppointments()
    }, [aToken])

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this appointment?')) return
        setCancelling(id)
        await cancelAppointment(id)
        setCancelling(null)
    }

    const filtered = (appointments || []).filter(item => {
        const q = search.toLowerCase()
        const matchSearch =
            !q ||
            item.userData?.name?.toLowerCase().includes(q) ||
            item.docData?.name?.toLowerCase().includes(q)

        const matchFilter =
            filter === 'all'       ? true :
            filter === 'cancelled' ? item.cancelled :
            filter === 'completed' ? item.isCompleted :
            filter === 'paid'      ? item.payment && !item.cancelled :
            !item.cancelled && !item.isCompleted && !item.payment

        return matchSearch && matchFilter
    })

    const counts = {
        all:       (appointments || []).length,
        pending:   (appointments || []).filter(a => !a.cancelled && !a.isCompleted && !a.payment).length,
        paid:      (appointments || []).filter(a => a.payment && !a.cancelled).length,
        completed: (appointments || []).filter(a => a.isCompleted).length,
        cancelled: (appointments || []).filter(a => a.cancelled).length,
    }

    const FILTERS = [
        { key: 'all',       label: 'All',       color: 'indigo' },
        { key: 'pending',   label: 'Pending',   color: 'amber'  },
        { key: 'paid',      label: 'Confirmed', color: 'sky'    },
        { key: 'completed', label: 'Completed', color: 'green'  },
        { key: 'cancelled', label: 'Cancelled', color: 'red'    },
    ]

    const colorMap = {
        indigo: { active: 'bg-primary text-white border-primary', inactive: 'bg-white text-primary border-blue-200 hover:bg-blue-50' },
        amber:  { active: 'bg-amber-500 text-white border-amber-500',   inactive: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'   },
        sky:    { active: 'bg-sky-500 text-white border-sky-500',       inactive: 'bg-white text-sky-600 border-sky-200 hover:bg-sky-50'         },
        green:  { active: 'bg-green-600 text-white border-green-600',   inactive: 'bg-white text-green-600 border-green-200 hover:bg-green-50'   },
        red:    { active: 'bg-red-500 text-white border-red-500',       inactive: 'bg-white text-red-500 border-red-200 hover:bg-red-50'         },
    }

    return (
        <div className='mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl flex-col px-3 py-5 sm:px-6'>

            <div className='mb-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <h1 className='text-xl font-bold tracking-tight text-slate-800'>All Appointments</h1>
                        <p className='mt-1 text-sm text-slate-500'>{filtered.length} of {appointmentPagination.total} appointments</p>
                    </div>

                    <div className='relative w-full sm:w-72'>
                        <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' />
                        </svg>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder='Search patient or doctor...'
                            className='w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100' />
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className='mb-4 flex gap-2 overflow-x-auto pb-1'>
                {FILTERS.map(f => {
                    const c = colorMap[f.color]
                    const isActive = filter === f.key
                    return (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${isActive ? c.active : c.inactive}`}>
                            {f.label} ({counts[f.key]})
                        </button>
                    )
                })}
            </div>

            <div className='flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]'>

                <div className='hidden shrink-0 grid-cols-[0.5fr_2fr_0.8fr_2fr_2fr_1fr_1fr] border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:grid'>
                    <p>#</p>
                    <p>Patient</p>
                    <p>Age</p>
                    <p>Date & Time</p>
                    <p>Doctor</p>
                    <p>Fees</p>
                    <p>Action</p>
                </div>

                {/* Rows */}
                <div className='flex-1 divide-y divide-slate-100 overflow-y-auto'>
                    {filtered.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-16 text-slate-400'>
                            <p className='text-sm font-medium'>No appointments found</p>
                            <p className='mt-1 text-xs'>Try adjusting your search or filter</p>
                        </div>
                    ) : filtered.map((item, index) => (
                        <div key={item._id || index}
                            className='flex flex-wrap items-center gap-y-1 px-6 py-3.5 text-sm text-slate-600 transition hover:bg-slate-50/70 sm:grid sm:grid-cols-[0.5fr_2fr_0.8fr_2fr_2fr_1fr_1fr]'>

                            <p className='hidden text-sm font-medium text-slate-400 sm:block'>{index + 1}</p>

                            {/* Patient */}
                            <div className='flex min-w-0 w-full items-center gap-2.5 sm:w-auto'>
                                <img className='h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200'
                                    src={item.userData?.image} alt='' />
                                <div className='min-w-0'>
                                    <p className='truncate font-medium text-slate-800'>{item.userData?.name}</p>
                                    <p className='text-xs text-slate-400 sm:hidden'>{slotDateFormat(item.slotDate)}</p>
                                </div>
                            </div>

                            {/* Age */}
                            <p className='hidden text-slate-500 sm:block'>{calculateAge(item.userData?.dob)}</p>

                            {/* Date */}
                            <div className='hidden sm:block'>
                                <p className='text-slate-700'>{slotDateFormat(item.slotDate)}</p>
                                <p className='text-xs text-slate-400'>{item.slotTime}</p>
                            </div>

                            {/* Doctor */}
                            <div className='flex min-w-0 items-center gap-2.5'>
                                <img className='h-9 w-9 shrink-0 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200'
                                    src={item.docData?.image} alt='' />
                                <div className='min-w-0'>
                                    <p className='truncate font-medium text-slate-800'>{item.docData?.name}</p>
                                    <p className='truncate text-xs text-slate-400'>{item.docData?.speciality}</p>
                                </div>
                            </div>

                            {/* Fees */}
                            <p className='font-semibold text-slate-800'>{currency}{item.amount}</p>

                            {/* Action */}
                            <div className='flex items-center gap-2'>
                                {item.cancelled ? (
                                    <span className='rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600'>Cancelled</span>
                                ) : item.isCompleted ? (
                                    <span className='rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600'>Completed</span>
                                ) : item.payment ? (
                                    <span className='rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600'>Confirmed</span>
                                ) : (
                                    <button onClick={() => handleCancel(item._id)} disabled={cancelling === item._id}
                                        className='disabled:opacity-50'>
                                        <img className='w-7 cursor-pointer transition hover:scale-110' src={assets.cancel_icon} alt='cancel' />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className='flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500'>
                    <span>Page {appointmentPagination.page} of {appointmentPagination.pages}</span>
                    <div className='flex gap-2'>
                        <button disabled={appointmentPagination.page <= 1} onClick={() => getAllAppointments(appointmentPagination.page - 1)} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40'>Previous</button>
                        <button disabled={appointmentPagination.page >= appointmentPagination.pages} onClick={() => getAllAppointments(appointmentPagination.page + 1)} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40'>Next</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AllAppointments