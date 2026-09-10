import React, { useContext, useState } from 'react'
import { assets } from '../../assets/assets'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const AddDoctor = () => {
    const [docImg,     setDocImg]     = useState(null)
    const [name,       setName]       = useState('')
    const [email,      setEmail]      = useState('')
    const [password,   setPassword]   = useState('')
    const [experience, setExperience] = useState('1 Year')
    const [fees,       setFees]       = useState('')
    const [about,      setAbout]      = useState('')
    const [speciality, setSpeciality] = useState('General physician')
    const [degree,     setDegree]     = useState('')
    const [address1,   setAddress1]   = useState('')
    const [address2,   setAddress2]   = useState('')
    const [city,       setCity]       = useState('')
    const [state,      setState]      = useState('')
    const [pincode,    setPincode]    = useState('')
    const [loading,    setLoading]    = useState(false)
    const [showPass,   setShowPass]   = useState(false)
    
    // Verification state
    const [step, setStep] = useState(1) // 1 = add doctor, 2 = verify token
    const [doctorId, setDoctorId] = useState('')
    const [doctorEmail, setDoctorEmail] = useState('')
    const [verificationToken, setVerificationToken] = useState('')
    const [verifyLoading, setVerifyLoading] = useState(false)

    const { backendUrl, getAllDoctors } = useContext(AdminContext)

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if (!docImg) return toast.error('Please upload a doctor image')
        if (Number(fees) <= 0) return toast.error('Fees must be greater than 0')

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('image',      docImg)
            formData.append('name',       name.trim())
            formData.append('email',      email.trim().toLowerCase())
            formData.append('password',   password)
            formData.append('experience', experience)
            formData.append('fees',       Number(fees))
            formData.append('about',      about.trim())
            formData.append('speciality', speciality)
            formData.append('degree',     degree.trim())
            formData.append('address',    JSON.stringify({ 
              line1: address1.trim(), 
              line2: address2.trim(),
              city: city.trim(),
              state: state.trim(),
              pincode: pincode.trim()
            }))

            const { data } = await axios.post(
                backendUrl + '/api/admin/add-doctor',
                formData,
                { withCredentials: true }
            )

            if (data.success) {
                toast.success(data.message)
                setDoctorId(data.doctorId)
                setDoctorEmail(email.trim().toLowerCase())
                setStep(2) // Move to verification step
            } else {
                toast.error(data.message)
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Server error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const onVerifyTokenHandler = async (e) => {
        e.preventDefault()
        if (!verificationToken.trim()) {
            return toast.error('Please enter the verification token')
        }

        setVerifyLoading(true)
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/verify-doctor-token',
                { doctorId, verificationToken: verificationToken.trim() },
                { withCredentials: true }
            )

            if (data.success) {
                toast.success(data.message)
                // Reset form and go back to step 1
                await getAllDoctors()
                setDocImg(null); setName(''); setPassword(''); setEmail('')
                setAddress1(''); setAddress2(''); setCity(''); setState(''); setPincode(''); setDegree(''); setAbout(''); setFees('')
                setExperience('1 Year'); setSpeciality('General physician')
                setStep(1)
                setDoctorId('')
                setDoctorEmail('')
                setVerificationToken('')
            } else {
                toast.error(data.message)
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Server error. Please try again.')
        } finally {
            setVerifyLoading(false)
        }
    }

    const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 outline-none bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400 text-gray-700 text-sm'
    const lbl = 'block text-sm font-semibold text-gray-600 mb-1.5 ml-1'

    const SPECIALITIES = ['General physician','Gynecologist','Dermatologist','Pediatricians','Neurologist','Gastroenterologist']

    if (step === 2) {
        return (
            <div className='mt-5 min-h-screen w-full bg-[#F8F9FD] p-4 sm:p-6'>
                <div className='mx-auto max-w-2xl'>
                    <div className='mb-6'>
                        <h1 className='text-xl font-bold tracking-tight text-slate-800 sm:text-2xl'>Verify Doctor Email</h1>
                        <p className='mt-1 text-sm text-slate-500'>Complete the email verification process</p>
                    </div>

                    <div className='rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_35px_rgba(15,23,42,0.06)] sm:p-8'>
                        <div className='mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4'>
                            <div className='flex gap-3'>
                                <div className='text-lg text-emerald-600'>✓</div>
                                <div>
                                    <p className='text-sm font-semibold text-emerald-800'>Doctor profile created successfully!</p>
                                    <p className='mt-1 text-sm text-emerald-700'>An email verification link has been sent to <strong>{doctorEmail}</strong></p>
                                </div>
                            </div>
                        </div>

                        <div className='mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4'>
                            <p className='mb-2 text-sm font-semibold text-indigo-900'>Next Steps:</p>
                            <ol className='list-inside list-decimal space-y-1 text-sm text-indigo-800'>
                                <li>The doctor will receive a verification email</li>
                                <li>They should click the link in the email</li>
                                <li>A verification code will be provided</li>
                                <li>Enter that code below to complete verification</li>
                            </ol>
                        </div>

                        <form onSubmit={onVerifyTokenHandler}>
                            <div className='mb-6'>
                                <label className={lbl}>Doctor Email</label>
                                <input 
                                    type='email' 
                                    value={doctorEmail} 
                                    disabled 
                                    className={inp + ' cursor-not-allowed bg-slate-100'}
                                />
                            </div>

                            <div className='mb-6'>
                                <label className={lbl}>Verification Token</label>
                                <input 
                                    onChange={e => setVerificationToken(e.target.value)} 
                                    value={verificationToken}
                                    className={inp} 
                                    type='text' 
                                    placeholder='Enter the verification code from email'
                                    required 
                                />
                                <p className='ml-1 mt-1.5 text-xs text-slate-500'>The doctor will provide this code to you after verifying their email</p>
                            </div>

                            <div className='flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row'>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setStep(1)
                                        setVerificationToken('')
                                    }}
                                    className='rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50'
                                >
                                    Back
                                </button>
                                <button 
                                    type='submit' 
                                    disabled={verifyLoading}
                                    className='flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-[0_12px_25px_rgba(79,70,229,0.25)] transition-all hover:-translate-y-0.5 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
                                >
                                    {verifyLoading ? (
                                        <>
                                            <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                                            Verifying...
                                        </>
                                    ) : 'Verify and Complete'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='mt-5 min-h-screen w-full bg-[#F8F9FD] p-4 sm:p-6'>
            <div className='mx-auto max-w-5xl'>

                {/* Header */}
                <div className='mb-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm'>
                    <h1 className='text-xl font-bold tracking-tight text-slate-800 sm:text-2xl'>Doctor Onboarding</h1>
                    <p className='mt-1 text-sm text-slate-500'>Fill in professional details to register a new practitioner.</p>
                </div>

                <form onSubmit={onSubmitHandler} className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.06)]'>

                    {/* Upload Section */}
                    <div className='border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-6 sm:p-8'>
                        <div className='flex flex-col items-center gap-5 sm:flex-row'>
                            <label htmlFor='doc-img' className='group relative shrink-0 cursor-pointer'>
                                <div className='h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md transition-all group-hover:opacity-90 sm:h-28 sm:w-28'>
                                    <img
                                        className='h-full w-full object-cover'
                                        src={docImg ? URL.createObjectURL(docImg) : assets.upload_area}
                                        alt='profile'
                                    />
                                </div>
                                <div className='absolute bottom-1 right-1 rounded-full border-2 border-white bg-indigo-600 p-1.5 shadow-sm transition-transform group-hover:scale-110'>
                                    <svg className='h-3.5 w-3.5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 4v16m8-8H4' />
                                    </svg>
                                </div>
                            </label>
                            <input onChange={e => setDocImg(e.target.files[0])} type='file' id='doc-img' accept='image/*' hidden />
                            <div className='text-center sm:text-left'>
                                <h3 className='text-base font-bold text-slate-700 sm:text-lg'>Profile Photo</h3>
                                <p className='mt-1 text-sm text-slate-500'>Upload a professional headshot. PNG or JPG, max 2MB.</p>
                                {docImg && (
                                    <p className='mt-1 text-xs font-medium text-emerald-600'>✓ {docImg.name}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fields */}
                    <div className='p-6 sm:p-8'>
                        <div className='grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2'>

                            {/* Left */}
                            <div className='space-y-5'>
                                <div>
                                    <label className={lbl}>Full Name</label>
                                    <input onChange={e => setName(e.target.value)} value={name}
                                        className={inp} type='text' placeholder='e.g. Dr. Adam Smith' required />
                                </div>
                                <div>
                                    <label className={lbl}>Email Address</label>
                                    <input onChange={e => setEmail(e.target.value)} value={email}
                                        className={inp} type='email' placeholder='doctor@hospital.com' required />
                                </div>
                                <div>
                                    <label className={lbl}>Password</label>
                                    <div className='relative'>
                                        <input onChange={e => setPassword(e.target.value)} value={password}
                                            className={inp + ' pr-12'} type={showPass ? 'text' : 'password'}
                                            placeholder='Set a strong password' required minLength={8} />
                                        <button type='button' onClick={() => setShowPass(p => !p)}
                                            className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600'>
                                            {showPass ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={lbl}>Experience</label>
                                    <select onChange={e => setExperience(e.target.value)} value={experience} className={inp}>
                                        {[...Array(15)].map((_, i) => (
                                            <option key={i} value={`${i + 1} Year`}>{i + 1} Year{i > 0 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right */}
                            <div className='space-y-5'>
                                <div>
                                    <label className={lbl}>Speciality</label>
                                    <select onChange={e => setSpeciality(e.target.value)} value={speciality} className={inp}>
                                        {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>Education / Degree</label>
                                    <input onChange={e => setDegree(e.target.value)} value={degree}
                                        className={inp} type='text' placeholder='e.g. MBBS, MD' required />
                                </div>
                                <div>
                                    <label className={lbl}>Consultation Fees (₹)</label>
                                    <input onChange={e => setFees(e.target.value)} value={fees}
                                        className={inp} type='number' placeholder='0' min='1' required />
                                </div>
                                <div>
                                    <label className={lbl}>Clinic Address</label>
                                    <div className='space-y-3'>
                                        <input onChange={e => setAddress1(e.target.value)} value={address1}
                                            className={inp} type='text' placeholder='Street address (5+ chars)' required minLength={5} />
                                        <input onChange={e => setAddress2(e.target.value)} value={address2}
                                            className={inp} type='text' placeholder='Apt, suite, etc. (optional)' />
                                        <input onChange={e => setCity(e.target.value)} value={city}
                                            className={inp} type='text' placeholder='City' required minLength={2} maxLength={50} />
                                        <input onChange={e => setState(e.target.value)} value={state}
                                            className={inp} type='text' placeholder='State' required minLength={2} maxLength={50} />
                                        <input onChange={e => setPincode(e.target.value)} value={pincode}
                                            className={inp} type='text' placeholder='Pincode (5-6 digits)' required pattern='^\d{5,6}$' />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        <div className='mt-6'>
                            <label className={lbl}>Professional Bio</label>
                            <textarea onChange={e => setAbout(e.target.value)} value={about}
                                className={inp + ' min-h-[110px] resize-none'}
                                placeholder="Briefly describe the doctor's expertise and background..." required />
                        </div>

                        {/* Submit */}
                        <div className='mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row'>
                            <p className='text-center text-xs text-slate-400 sm:text-left'>
                                Make sure all information is accurate before submitting.
                            </p>
                            <button type='submit' disabled={loading}
                                className='flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-10 py-3.5 font-bold text-white shadow-[0_12px_25px_rgba(79,70,229,0.25)] transition-all hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'>
                                {loading ? (
                                    <>
                                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                                        Creating...
                                    </>
                                ) : 'Create Doctor Profile'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddDoctor