import React from 'react'
import { specialityData } from '../assets/assets'
import {Link} from 'react-router-dom'


const SpecialityMenu = () => {
    return (
        <div className='flex flex-col items-center gap-8 py-10 text-slate-800 md:py-16' id='speciality'>
            <div className='text-center'>
                <p className='mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary'>Care areas</p>
                <h1 className='text-3xl font-bold md:text-4xl'>Find Doctors by Speciality</h1>
                <p className='mx-auto mt-3 max-w-xl text-sm text-slate-500 md:text-base'>Explore top specialists and book appointments in just a few clicks.</p>
            </div>

            <div className='flex w-full gap-5 overflow-x-auto px-4 pb-3 sm:justify-center'>
                {specialityData.map((item, index) => (
                    <Link
                        onClick={() => scrollTo(0, 0)}
                        className='group relative flex min-w-[140px] shrink-0 flex-col items-center rounded-[24px] border border-slate-200 bg-white p-4 text-center text-sm shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-[0_22px_50px_rgba(59,130,246,0.15)] sm:min-w-[170px] sm:p-5'
                        key={index}
                        to={`/doctors/${item.speciality}`}
                    >
                        <div className='absolute inset-x-4 top-0 h-16 rounded-b-[22px] bg-gradient-to-r from-sky-50 via-white to-cyan-50 opacity-90' />
                        <div className='relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-accent/10 ring-1 ring-slate-100 shadow-inner shadow-sky-100'>
                            <img className='w-10 sm:w-12' src={item.image} alt='' />
                        </div>
                        <p className='relative font-semibold text-slate-800 transition-colors group-hover:text-primary'>{item.speciality}</p>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default SpecialityMenu
