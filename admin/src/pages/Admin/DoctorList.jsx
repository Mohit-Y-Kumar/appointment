import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { assets } from '../../assets/assets'

const DoctorList = () => {
    const { doctors, aToken, getAllDoctors, changeAvailability } = useContext(AdminContext)
    const [search,    setSearch]    = useState('')
    const [filterSp,  setFilterSp]  = useState('All')
    const [toggling,  setToggling]  = useState(null)

    useEffect(() => {
        if (aToken) getAllDoctors()
    }, [aToken])

    const SPECIALITIES = ['All','General physician','Gynecologist','Dermatologist','Pediatricians','Neurologist','Gastroenterologist']

    const filtered = (doctors || []).filter(doc => {
        const matchSearch = !search || doc.name?.toLowerCase().includes(search.toLowerCase())
        const matchSp = filterSp === 'All' || doc.speciality === filterSp
        return matchSearch && matchSp
    })

    const handleToggle = async (id) => {
        setToggling(id)
        await changeAvailability(id)
        setToggling(null)
    }

    const available   = (doctors || []).filter(d => d.available).length
    const unavailable = (doctors || []).length - available

    return (
        <div className='mt-5 w-full overflow-x-hidden p-4 sm:p-8'>

            {/* Header */}
            <div className='mb-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-5'>
                <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
                    <div>
                        <h1 className='text-xl font-bold tracking-tight text-slate-800 sm:text-2xl'>All Doctors</h1>
                        <p className='mt-1 text-sm text-slate-500'>
                            {(doctors || []).length} doctors registered &nbsp;·&nbsp;
                            <span className='font-medium text-emerald-600'>{available} available</span>
                            {unavailable > 0 && <span className='text-slate-400'> · {unavailable} unavailable</span>}
                        </p>
                    </div>

                    <div className='relative w-full sm:w-64'>
                        <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' />
                        </svg>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder='Search doctor...'
                            className='w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100' />
                    </div>
                </div>
            </div>

            {/* Speciality Filter */}
            <div className='mb-6 flex gap-2 overflow-x-auto pb-2'>
                {SPECIALITIES.map(sp => (
                    <button key={sp} onClick={() => setFilterSp(sp)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${filterSp === sp
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.25)]'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'}`}>
                        {sp}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-20 text-slate-400'>
                    <p className='text-sm font-medium'>No doctors found</p>
                    <p className='mt-1 text-xs'>Try a different search or filter</p>
                </div>
            ) : (
                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
                    {filtered.map((doc, index) => (
                        <div key={doc._id || index}
                            className='group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(79,70,229,0.12)]'>

                            {/* Image */}
                            <div className='relative h-52 overflow-hidden bg-indigo-50/70'>
                                <img
                                    className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                                    src={doc.image} alt={doc.name} />
                                <div className='absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />

                                {/* Rating badge */}
                                {doc.averageRating > 0 && (
                                    <div className='absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm backdrop-blur'>
                                        <img src={assets.filledStar} className='h-4 w-4' alt='' />
                                        <span className='text-xs font-bold text-slate-700'>{doc.averageRating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className='p-5'>
                                <p className='truncate text-base font-bold text-slate-900'>{doc.name}</p>
                                <p className='mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600'>{doc.speciality}</p>
                                <p className='mt-2 text-xs text-slate-400'>{doc.experience} experience</p>

                                {/* Divider */}
                                <div className='mt-3 flex items-center justify-between border-t border-slate-100 pt-3'>
                                    <div className='flex items-center gap-1.5'>
                                        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${doc.available ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'bg-slate-300'}`} />
                                        <p className={`text-xs font-medium ${doc.available ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {doc.available ? 'Available' : 'Unavailable'}
                                        </p>
                                    </div>

                                    {/* Toggle */}
                                    <label className='relative inline-flex cursor-pointer items-center'>
                                        <input type='checkbox' className='peer sr-only'
                                            checked={doc.available}
                                            onChange={() => handleToggle(doc._id)}
                                            disabled={toggling === doc._id} />
                                        <div className={`h-5 w-9 rounded-full transition-all after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-slate-200 after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white ${toggling === doc._id ? 'cursor-wait bg-slate-200' : 'bg-slate-200 peer-checked:bg-indigo-600'}`} />
                                    </label>
                                </div>

                                {/* Stats */}
                                <div className='mt-3 grid grid-cols-2 gap-2'>
                                    <div className='rounded-xl bg-slate-50 px-2 py-1.5 text-center'>
                                        <p className='text-xs font-bold text-slate-700'>{doc.totalReviews || 0}</p>
                                        <p className='text-[10px] text-slate-400'>Reviews</p>
                                    </div>
                                    <div className='rounded-xl bg-slate-50 px-2 py-1.5 text-center'>
                                        <p className='text-xs font-bold text-slate-700'>₹{doc.fees}</p>
                                        <p className='text-[10px] text-slate-400'>Fees</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default DoctorList