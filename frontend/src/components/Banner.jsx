import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const Banner = () => {
    const navigate = useNavigate()

    return (
        <div className='my-20 flex flex-col overflow-hidden rounded-[30px] border border-sky-100 bg-gradient-to-br from-[#102a43] via-[#1d4ed8] to-[#14b8a6] px-6 sm:px-10 md:flex-row md:px-12 lg:px-14'>
            <div className='flex flex-1 flex-col justify-center gap-4 py-10 sm:py-12 md:py-16 lg:py-20'>
                <p className='text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl'>
                    Book Appointments Instantly
                </p>
                <p className='max-w-md text-sm text-sky-50/80 sm:text-base'>
                    Connect with 100+ verified doctors and get the care you need — anytime, anywhere.
                </p>
                <button
                    onClick={() => { navigate('/login'); window.scrollTo(0, 0) }}
                    className='mt-2 inline-flex w-fit items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-[0_18px_35px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5 sm:text-base'
                >
                    Get Started →
                </button>
            </div>

            <div className='relative hidden items-end justify-end overflow-hidden pb-4 md:flex md:w-1/2'>
                <img
                    className='h-auto w-full max-w-[420px] object-contain object-bottom drop-shadow-[0_30px_45px_rgba(15,23,42,0.22)]'
                    src={assets.appointment_img}
                    alt="Book appointment illustration"
                />
            </div>
        </div>
    )
}

export default Banner