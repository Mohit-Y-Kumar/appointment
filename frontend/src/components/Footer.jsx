import React from 'react'
import { NavLink } from 'react-router-dom'
import BrandMark from './BrandMark'

const Footer = () => {
    return (
        <footer className='mt-20 bg-slate-950 text-slate-300'>
            <div className='mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10'>
                <div className='grid gap-10 sm:grid-cols-[2fr_1fr_1fr]'>
                    <div>
                        <div className='mb-5'>
                            <BrandMark className='text-white' compact />
                        </div>
                        <p className='max-w-md text-sm leading-6 text-slate-400'>
                            DocNest connects patients with trusted clinicians and streamlined care access for a more confident, modern healthcare experience.
                        </p>
                    </div>

                    <div>
                        <p className='mb-5 text-base font-semibold text-white'>Company</p>
                        <ul className='flex flex-col gap-3 text-sm'>
                            <li>
                                <NavLink to='/' onClick={() => window.scrollTo(0, 0)} className='transition-colors hover:text-white'>
                                    Home
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to='/about' onClick={() => window.scrollTo(0, 0)} className='transition-colors hover:text-white'>
                                    About Us
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to='/contact' onClick={() => window.scrollTo(0, 0)} className='transition-colors hover:text-white'>
                                    Contact Us
                                </NavLink>
                            </li>
                            <li>
                                <span className='cursor-pointer transition-colors hover:text-white'>
                                    Privacy Policy
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className='mb-5 text-base font-semibold text-white'>Get in Touch</p>
                        <ul className='flex flex-col gap-3 text-sm'>
                            <li>
                                <a href='tel:+919876543210' className='transition-colors hover:text-white'>
                                    +91 98765 43210
                                </a>
                            </li>
                            <li>
                                <a href='mailto:support@docnest.com' className='break-all transition-colors hover:text-white'>
                                    support@docnest.com
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className='border-t border-slate-800 py-5 text-center text-xs text-slate-500'>
                © {new Date().getFullYear()} DocNest Healthcare. All rights reserved.
            </div>
        </footer>
    )
}

export default Footer