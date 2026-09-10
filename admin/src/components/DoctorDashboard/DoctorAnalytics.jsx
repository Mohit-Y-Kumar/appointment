import React from 'react'
import star from '../../assets/yellowStar.svg'
import { CardHeader, HealthBar, BRAND_PINK, AMBER, GREEN, RED } from '../../utils/DoctorDashboardUtils'

const DoctorAnalytics = ({ compPct, pendPct, cancPct, patPct, ratingsData, avgRating }) => {
    return (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>

            {/* Performance */}
            <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_24px_rgba(15,23,42,0.04)]'>
                <CardHeader dot={BRAND_PINK} title='Performance' />
                <div className='px-4 py-3'>
                    <HealthBar label='Completed'      value={compPct} color={GREEN} />
                    <HealthBar label='Pending'        value={pendPct} color={AMBER} />
                    <HealthBar label='Cancellation'   value={cancPct} color={RED}   />
                    <HealthBar label='Patient Return' value={patPct}  color={BRAND_PINK} />
                </div>
            </div>

            {/* Ratings */}
            <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_24px_rgba(15,23,42,0.04)]'>
                <CardHeader
                    dot={AMBER}
                    title='Patient Ratings'
                    right={avgRating > 0
                        ? <span className='rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600'>{avgRating} avg</span>
                        : null}
                />
                <div className='px-4 py-3'>
                    {ratingsData?.byStars?.length > 0
                        ? ratingsData.byStars.map(r => (
                            <div key={r.stars} className='flex items-center gap-2 py-1.5'>
                                <span className='flex items-center gap-1 text-[10px] text-gray-500 w-8 shrink-0'>
                                    <span>{r.stars}</span>
                                    <img src={star} alt='star' className='w-3 h-3' />
                                </span>
                                <div className='flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden'>
                                    <div className='h-full rounded-full transition-all duration-700'
                                        style={{ width: `${r.pct}%`, background: r.stars >= 4 ? AMBER : r.stars === 3 ? '#fcd34d' : RED }} />
                                </div>
                                <span className='text-[10px] text-gray-400 w-7 text-right shrink-0'>{r.pct}%</span>
                            </div>
                        ))
                        : <div className='py-6 text-center text-sm text-gray-400'>No ratings yet</div>
                    }
                </div>
            </div>
        </div>
    )
}

export default DoctorAnalytics