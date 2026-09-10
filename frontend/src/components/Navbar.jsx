import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'
import BrandMark from './BrandMark'

const Navbar = () => {
    const navigate = useNavigate()
    const { token, setToken, userData, backendUrl } = useContext(AppContext)

    const [showMenu, setShowMenu] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (showMenu) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [showMenu])

    const logout = () => {
        setToken(false)
        axios.post(`${backendUrl}/api/user/logout`, {}, { withCredentials: true }).catch(() => {})
        setShowMenu(false)
        toast.success('Logged out successfully.')
        navigate('/')
    }

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/doctors', label: 'All Doctors' },
        { to: '/about', label: 'About' },
        { to: '/contact', label: 'Contact' },
    ]

    return (
        <>
            <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-white/85 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] border-b border-slate-200/80' : 'bg-white/70 backdrop-blur-xl border-b border-slate-200/70'} `}>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <div className='flex items-center justify-between h-16 sm:h-18'>

                        <div onClick={() => navigate('/')} className='cursor-pointer shrink-0'>
                            <BrandMark compact className='scale-[0.9] origin-left' />
                        </div>

                        <ul className='hidden md:flex items-center gap-1.5'>
                            {navLinks.map(({ to, label }) => (
                                <NavLink key={to} to={to}>
                                    {({ isActive }) => (
                                        <li className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer
                                            ${isActive
                                                ? 'text-primary bg-primary/8 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                            }`}>
                                            {label}
                                            {isActive && (
                                                <span className='absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full' />
                                            )}
                                        </li>
                                    )}
                                </NavLink>
                            ))}
                        </ul>

                        <div className='flex items-center gap-3'>
                            {token && userData ? (
                                <div className='hidden md:flex items-center gap-2 cursor-pointer group relative'>
                                    <img
                                        className='w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all'
                                        src={userData.image}
                                        alt={userData.name}
                                    />
                                    <div className='flex flex-col leading-tight'>
                                        <span className='max-w-28 truncate text-xs font-semibold text-slate-800'>{userData.name}</span>
                                        <span className='text-[10px] text-slate-400'>Patient</span>
                                    </div>
                                    <img className='w-2.5 opacity-50 group-hover:opacity-100 transition' src={assets.dropdown_icon} alt="" />

                                    <div className='absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0'>
                                        <div className='px-4 py-2 border-b border-slate-100 mb-1'>
                                            <p className='text-xs text-slate-400'>Signed in as</p>
                                            <p className='text-sm font-semibold text-slate-800 truncate'>{userData.name}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/my-profile')}
                                            className='w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition'
                                        >
                                            <span><img src={assets.userIcon} className='h-4 w-4' alt="" /></span> My Profile
                                        </button>
                                        <button
                                            onClick={() => navigate('/my-appointments')}
                                            className='w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition'
                                        >
                                            <span><img src={assets.appointiconIcon} className='h-4 w-4' alt="" /></span> My Appointments
                                        </button>
                                        <div className='border-t border-slate-100 mt-1 pt-1'>
                                            <button
                                                onClick={logout}
                                                className='w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition'
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className='hidden md:flex items-center gap-2 bg-gradient-to-r from-primary to-sky-500 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-[0_10px_25px_rgba(59,130,246,0.28)] hover:shadow-[0_12px_30px_rgba(59,130,246,0.32)] transition-all'
                                >
                                    Create Account
                                </button>
                            )}

                            <button
                                onClick={() => setShowMenu(true)}
                                className='md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition'
                                aria-label='Open menu'
                            >
                                <span className='w-4 h-0.5 bg-slate-700 rounded-full' />
                                <span className='w-4 h-0.5 bg-slate-700 rounded-full' />
                                <span className='w-3 h-0.5 bg-slate-700 rounded-full self-start ml-2.5' />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${showMenu ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-slate-900/45 backdrop-blur-sm transition-opacity duration-300 ${showMenu ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setShowMenu(false)}
                />

                <div className={`absolute top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${showMenu ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className='flex items-center justify-between px-5 py-4 border-b border-slate-100'>
                        <BrandMark compact />
                        <button
                            onClick={() => setShowMenu(false)}
                            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition'
                            aria-label='Close menu'
                        >
                            <img src={assets.cross_icon} className='w-4 h-4' alt="close" />
                        </button>
                    </div>

                    {token && userData && (
                        <div className='flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100'>
                            <img
                                className='w-11 h-11 rounded-full object-cover ring-2 ring-primary/20'
                                src={userData.image}
                                alt={userData.name}
                            />
                            <div>
                                <p className='text-sm font-semibold text-slate-800'>{userData.name}</p>
                                <p className='text-xs text-slate-400'>Patient Account</p>
                            </div>
                        </div>
                    )}

                    <ul className='flex flex-col px-3 py-4 gap-1 flex-1'>
                        {navLinks.map(({ to, label }) => (
                            <NavLink key={to} to={to} onClick={() => setShowMenu(false)}>
                                {({ isActive }) => (
                                    <li className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all
                                        ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}>
                                        {label}
                                    </li>
                                )}
                            </NavLink>
                        ))}

                        {token && userData && (
                            <div className='mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1'>
                                <button
                                    onClick={() => { navigate('/my-profile'); setShowMenu(false) }}
                                    className='px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 text-left transition flex items-center gap-2'
                                >
                                    <span><img src={assets.userIcon} className='h-4 w-4' alt="" /></span> My Profile
                                </button>
                                <button
                                    onClick={() => { navigate('/my-appointments'); setShowMenu(false) }}
                                    className='px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 text-left transition flex items-center gap-2'
                                >
                                    <span><img src={assets.appointiconIcon} className='h-4 w-4' alt="" /></span> My Appointments
                                </button>
                            </div>
                        )}
                    </ul>

                    <div className='px-5 py-5 border-t border-slate-100'>
                        {token && userData ? (
                            <button
                                onClick={logout}
                                className='w-full py-3 rounded-2xl text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition flex items-center justify-center gap-2'
                            >
                                Logout
                            </button>
                        ) : (
                            <button
                                onClick={() => { navigate('/login'); setShowMenu(false) }}
                                className='w-full py-3 rounded-2xl text-sm font-medium bg-gradient-to-r from-primary to-sky-500 text-white hover:opacity-95 transition shadow-sm'
                            >
                                Create Account
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Navbar