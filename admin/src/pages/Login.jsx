import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { DoctorContext } from '../context/DoctorContext'
import { getCsrfToken } from '../utils/csrfToken.js'
import { setActiveRole } from '../utils/authRefresh.js'

const Login = () => {
    const navigate = useNavigate()

    const [state, setState] = useState('Admin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const { setAToken, backendUrl } = useContext(AdminContext)
    const { setDToken } = useContext(DoctorContext)

    const onSubmitHandler = async (event) => {
        event.preventDefault()

        try {
            if (!getCsrfToken()) {
                await axios.get(backendUrl + '/health', { withCredentials: true })
            }

            if (state === 'Admin') {
                const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password }, { withCredentials: true })
                if (data.success) {
                    setActiveRole('admin')
                    setAToken(true)
                    navigate('/admin-dashboard')
                } else {
                    toast.error(data.message);
                }

            } else {

                const { data } = await axios.post(backendUrl + '/api/doctor/login', { email, password }, { withCredentials: true })

                if (data.success) {
                    setActiveRole('doctor')
                    setDToken(true)
                    navigate('/doctor-dashboard')
                } else {
                    toast.error(data.message);
                }


            }

        } catch (error) {
            console.error('Login error:', error.response ? error.response.data : error.message);
        }
    }

    return (
        <form onSubmit={onSubmitHandler} className='flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-8'>
            <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-xl shadow-slate-200/60 sm:p-8'>
                <p className='text-center text-xl font-semibold text-slate-800 sm:text-2xl'>
                    <span className='text-primary'> {state} </span> Login
                </p>
                <div className='mt-6 w-full'>
                    <label className='mb-1.5 block font-medium text-slate-600' htmlFor='login-email'>Email</label>
                    <input id='login-email' onChange={(e) => setEmail(e.target.value)} value={email} className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10' type='email' required />
                </div>
                <div className='mt-4 w-full'>
                    <label className='mb-1.5 block font-medium text-slate-600' htmlFor='login-password'>Password</label>
                    <input id='login-password' onChange={(e) => setPassword(e.target.value)} value={password} className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10' type='password' required />
                </div>
                <button className='mt-6 w-full rounded-xl bg-primary py-3 text-base font-semibold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90'>Login</button>
                {
                    state === 'Admin'
                        ? <p className='mt-5 text-center text-slate-500'>Doctor Login? <button type='button' className='font-semibold text-primary underline underline-offset-2' onClick={() => setState('Doctor')}>Click here</button></p>
                        : <p className='mt-5 text-center text-slate-500'>Admin Login? <button type='button' className='font-semibold text-primary underline underline-offset-2' onClick={() => setState('Admin')}>Click here</button></p>
                }

            </div>
        </form>
    )
}

export default Login
