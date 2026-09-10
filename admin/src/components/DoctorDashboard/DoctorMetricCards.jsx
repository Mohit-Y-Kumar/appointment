import React from 'react'
import { assets } from '../../assets/assets'
import star from '../../assets/yellowStar.svg'
import { MetricCard, BRAND, BRAND_PINK, GREEN, AMBER, makeTrendUI } from '../../utils/DoctorDashboardUtils'

const DoctorMetricCards = ({ dashData, currency, ratingsData, earningsTrend, appointmentDelta, patientTrend }) => {

    const earningsUpText   = makeTrendUI(earningsTrend)
    const apptUpText       = makeTrendUI(appointmentDelta)
    const patientUpText    = makeTrendUI(patientTrend)

    const avgRating    = ratingsData?.average ?? 0
    const totalReviews = ratingsData?.totalReviews ?? 0

    return (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
                label='Total Earnings'
                value={`${currency}${(dashData.earnings ?? 0).toLocaleString()}`}
                upText={earningsUpText}
                sub={earningsUpText
                    ? <span className='text-gray-800'><span className='font-semibold'>vs </span><span className='text-sm'>prev period</span></span>
                    : <span className='text-gray-800'>No trend data</span>}
                accentColor={BRAND}
                icon={assets.earning_icon}
            />
            <MetricCard
                label='Appointments'
                value={dashData.appointments ?? 0}
                upText={apptUpText}
                sub={apptUpText
                    ? <span className='text-gray-800'><span className='text-lg font-semibold'>vs </span><span className='text-sm'>prev period</span></span>
                    : <span className='text-gray-800'>No trend data</span>}
                accentColor={BRAND_PINK}
                icon={assets.appointments_icon}
            />
            <MetricCard
                label='Unique Patients'
                value={dashData.patients ?? 0}
                upText={patientUpText}
                sub={patientUpText
                    ? <span className='text-gray-800'><span className='text-lg font-semibold'>vs </span><span className='text-sm'>prev period</span></span>
                    : <span className='text-gray-800'>No trend data</span>}
                accentColor={GREEN}
                icon={assets.patients_icon}
            />
            <MetricCard
                label='Avg Rating'
                value={avgRating
                    ? <div className='flex items-center gap-1 sm:gap-2 group'>
                        <span className='font-semibold'>{avgRating}</span>
                        <img src={star} alt='star' className='w-6 h-6 sm:w-8 sm:h-8 transition-all duration-300 group-hover:scale-100 group-hover:drop-shadow-[0_0_6px_rgba(230,191,36,0.9)]' />
                      </div>
                    : '—'}
                upText={totalReviews
                    ? <div className='flex mt-3 items-center gap-1'>
                        <span className='font-semibold text-xl sm:text-2xl text-gray-900'>{totalReviews}</span>
                        <span className='text-sm sm:text-base text-gray-600'>reviews</span>
                      </div>
                    : null}
                sub={totalReviews ? null : 'No reviews yet'}
                accentColor={AMBER}
            />
        </div>
    )
}

export default DoctorMetricCards