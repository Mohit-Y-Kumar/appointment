import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import DoctorCard from './DoctorCard'
import { assets } from '../assets/assets'

const TopDoctors = () => {
    const navigate = useNavigate()
    const { doctors } = useContext(AppContext)

    return (
        <div className='my-16 flex flex-col items-center gap-5 text-slate-900 md:mx-10'>
            <div className='text-center'>
                <p className='mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary'>Our specialists</p>
                <h1 className='text-3xl font-semibold md:text-4xl'>Top Rated Doctors</h1>
                <p className='mx-auto mt-3 max-w-xl text-sm text-slate-500 md:text-base'>
                    Discover experienced doctors, check availability, and book appointments effortlessly.
                </p>
            </div>

            <div className='grid w-full grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 gap-y-8 px-3 pt-5 sm:px-0'>
                {doctors.slice(0, 10).map((item, index) => (
                    <DoctorCard key={index} item={item} />
                ))}
            </div>

            <button
                onClick={() => { navigate('/doctors'); scrollTo(0, 0) }}
                className='group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-sky-500 px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(59,130,246,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(59,130,246,0.32)]'
            >
                <span>View All Doctors</span>
                <span className='transition-transform duration-300 group-hover:translate-x-1'>
                    <img src={assets.arrow_icon} alt="arrow" className='h-4 w-4' />
                </span>
            </button>
        </div>
    )
}

export default TopDoctors