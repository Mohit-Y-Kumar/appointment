import React from 'react'
import { CardHeader, StatusBadge, SectionDot, DOT_COLORS, BRAND, GREEN, AMBER } from '../../utils/DoctorDashboardUtils'

const DoctorUpcomingToday = ({ upcoming, latestAppts, currency, slotDateFormat }) => {
    return (
        <div className='flex flex-col gap-4'>

            {/* Upcoming Today */}
            <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_24px_rgba(15,23,42,0.04)]'>
                <CardHeader
                    dot={GREEN}
                    title='Upcoming Today'
                    right={
                        <span className='rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-600'>
                            {upcoming.length} left
                        </span>
                    }
                />
                {upcoming.length > 0 ? (
                    <div className='divide-y divide-gray-50'>
                        {upcoming.slice(0, 5).map((u, i) => (
                            <div key={u._id ?? i} className='flex items-center gap-3 px-4 py-2.5 hover:bg-green-50/30 transition-colors'>
                                <span className='text-[10px] font-bold px-2 py-1 rounded-lg shrink-0'
                                    style={{ background: '#eef0ff', color: '#1A1F5E' }}>
                                    {u.slotTime}
                                </span>
                                <div className='min-w-0'>
                                    <p className='text-xs font-semibold text-gray-800 truncate'>{u.userData?.name ?? '—'}</p>
                                    <p className='text-[10px] text-gray-400'>
                                        {u.payment ? 'Online' : 'Cash'} · {u.amount ? `${currency}${u.amount}` : '—'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className='px-4 py-6 text-sm text-center text-gray-400'>No appointments today</p>
                )}
            </div>

            {/* Recent Activity */}
            <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_24px_rgba(15,23,42,0.04)]'>
                <CardHeader
                    dot={AMBER}
                    title='Recent Activity'
                    right={<span className='text-[10px] text-slate-400'>{latestAppts.length} events</span>}
                />
                <div className='divide-y divide-gray-50'>
                    {latestAppts.length > 0
                        ? latestAppts.slice(0, 6).map((item, i) => {
                            const action = item.cancelled
                                ? 'cancelled their appointment'
                                : item.isCompleted
                                    ? '— consultation completed ✓'
                                    : 'booked an appointment'
                            return (
                                <div key={item._id ?? i} className='flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors'>
                                    <div className='w-2 h-2 rounded-full shrink-0 mt-1.5'
                                        style={{ background: DOT_COLORS[i % DOT_COLORS.length] }} />
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-xs text-gray-700'>
                                            <span className='font-semibold'>{item.userData?.name ?? '—'}</span> {action}
                                        </p>
                                        <p className='text-[10px] text-gray-400 mt-0.5'>{slotDateFormat(item.slotDate)}</p>
                                    </div>
                                    <StatusBadge item={item} />
                                </div>
                            )
                        })
                        : <p className='px-4 py-8 text-sm text-center text-gray-400'>No recent activity</p>
                    }
                </div>
            </div>
        </div>
    )
}

export default DoctorUpcomingToday