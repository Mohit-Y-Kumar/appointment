import React from 'react'
import { assets, heroDoctorImages } from '../assets/assets'

const Header = () => {
    return (
        <div className='relative overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-[#102a43] via-[#1d4ed8] to-[#14b8a6] px-4 py-6 shadow-[0_30px_60px_rgba(29,78,216,0.18)] md:px-8 lg:px-10'>
            <div className='absolute -left-16 top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl' />
            <div className='absolute right-0 top-0 h-60 w-60 rounded-full bg-cyan-300/20 blur-3xl' />

            <div className='relative flex flex-col gap-8 md:flex-row md:items-center'>
                <div className='md:w-1/2 lg:pr-6'>
                    <span className='mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-50 ring-1 ring-white/20 backdrop-blur-sm'>
                        Trusted healthcare, simplified
                    </span>
                    <p className='text-3xl font-bold leading-[1.08] text-white md:text-4xl lg:text-5xl'>
                        Find & Book Trusted Doctors Instantly
                    </p>
                    <p className='mt-4 max-w-lg text-sm font-medium text-sky-50/90 sm:text-base'>
                        Your Health, Our Priority — Book with Confidence
                    </p>
                    <p className='mt-3 max-w-xl text-sm leading-relaxed text-sky-100/80'>
                        Explore verified doctors, compare specialties, and secure appointments in just a few clicks.
                    </p>
                    <div className='mt-6 flex flex-wrap items-center gap-3'>
                        <a
                            href='#speciality'
                            className='flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-[0_14px_30px_rgba(255,255,255,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(255,255,255,0.35)]'
                        >
                            Book Now
                            <img className='w-3' src={assets.arrow_icon} alt='arrow' />
                        </a>
                        <div className='flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-xs text-sky-50 ring-1 ring-white/20 backdrop-blur-sm'>
                            <span className='inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400' />
                            100+ verified doctors
                        </div>
                    </div>
                </div>

                <div className='relative flex min-h-[300px] items-end justify-center md:w-1/2 md:min-h-[460px]'>
                    <div className='relative h-[320px] w-full max-w-[620px] md:h-[470px]'>
                        {heroDoctorImages.map((image, index) => (
                            <img
                                key={image}
                                className='absolute bottom-0 h-full object-contain object-bottom drop-shadow-[0_35px_60px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:scale-[1.04]'
                                src={image}
                                alt={index === 0 ? 'Doctor illustration' : ''}
                                aria-hidden={index !== 0}
                                data-testid='hero-doctor'
                                loading={index === 0 ? 'eager' : 'lazy'}
                                decoding='async'
                                style={{
                                    left: `${index * 12}%`,
                                    width: '62%',
                                    transform: index === 0 ? 'scale(1.22)' : 'scale(1.1)',
                                    zIndex: index + 1,
                                }}
                            />
                        ))}

                        
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Header