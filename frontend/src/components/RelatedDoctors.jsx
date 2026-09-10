import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import DoctorCard from './DoctorCard'
import { assets } from '../assets/assets'

const RelatedDoctors = ({ speciality, docId }) => {
    const { doctors } = useContext(AppContext)
    const navigate = useNavigate()
    const [relDoc, setRelDocs] = useState([])

    useEffect(() => {
        if (doctors.length > 0 && speciality) {
            const doctorsData = doctors.filter(
                (doc) => doc.speciality === speciality && doc._id !== docId
            )
            setRelDocs(doctorsData)
        }
    }, [doctors, speciality, docId])

    return (
        <div className='flex flex-col items-center gap-4 my-16 text-gray-900 md:mx-10'>
            <h1 className='text-3xl font-medium'>Top Doctors to Book</h1>
            <p className='sm:w-1/3 text-center text-sm'>
                Explore a curated list of highly qualified and trusted doctors
                based on your selected speciality.
            </p>

            <div className='w-full grid gap-4 gap-y-6 pt-5 px-3 sm:px-0 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'>
                {relDoc.slice(0, 5).map((item, index) => (
                    <DoctorCard key={index} item={item} />
                ))}
            </div>

            <button
                onClick={() => { navigate('/doctors'); scrollTo(0, 0) }}
                className='group flex items-center gap-2 bg-linear-to-r from-primary via-sky-600 to-accent text-white px-12 py-3 rounded-full mt-10'
            >
                <span>View more Doctors</span>

                <span className='transition-transform duration-300 group-hover:translate-x-1'>
                    <img
                        src={assets.arrow_icon}
                        alt="arrow"
                        className='h-4 w-4'
                    />
                </span>
            </button>
        </div>
    )
}

export default RelatedDoctors