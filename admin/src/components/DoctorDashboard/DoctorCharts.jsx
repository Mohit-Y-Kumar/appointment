import React from 'react'
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer,
} from 'recharts'
import { CardHeader, PeriodTabs, CustomTooltip, Spinner, BRAND, AMBER } from '../../utils/DoctorDashboardUtils'

const DoctorCharts = ({
    visitData, visitPeriod, onVisitPeriod, loadingVisit,
    revenueData, revPeriod, onRevPeriod, loadingRev,
    currency
}) => {
    return (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>

            {/* Patient Visits */}
            <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_24px_rgba(15,23,42,0.04)]'>
                <CardHeader
                    dot={BRAND}
                    title='Patient Visits'
                    right={<PeriodTabs options={['daily', 'monthly', 'yearly']} value={visitPeriod} onChange={onVisitPeriod} />}
                />
                <div className='p-3 sm:p-4'>
                    {loadingVisit ? <Spinner color={BRAND} /> : visitData.length === 0 ? (
                        <div className='h-40 sm:h-48 flex items-center justify-center text-sm text-gray-400'>No visit data yet</div>
                    ) : (
                        <ResponsiveContainer width='100%' height={160} className='sm:h-48!'>
                            <BarChart data={visitData} barCategoryGap='30%'>
                                <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.05)' vertical={false} />
                                <XAxis dataKey='name' tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey='new' name='New Patients' stackId='a' fill={BRAND} radius={[0, 0, 0, 0]} />
                                <Bar dataKey='ret' name='Returning'    stackId='a' fill='#c7d2fe' radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    {visitData.length > 0 && (
                        <div className='flex gap-3 sm:gap-4 mt-2'>
                            {[['New Patients', BRAND], ['Returning', '#c7d2fe']].map(([l, c]) => (
                                <span key={l} className='flex items-center gap-1.5 text-[10px] text-gray-400'>
                                    <span className='w-2.5 h-2.5 rounded-sm inline-block' style={{ background: c }} />{l}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Revenue Trend */}
            <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
                <CardHeader
                    dot={AMBER}
                    title='Revenue Trend'
                    right={<PeriodTabs options={['daily', 'monthly', 'yearly']} value={revPeriod} onChange={onRevPeriod} />}
                />
                <div className='p-4'>
                    {loadingRev ? <Spinner color={AMBER} /> : revenueData.length === 0 ? (
                        <div className='h-48 flex items-center justify-center text-sm text-gray-400'>No revenue data yet</div>
                    ) : (
                        <ResponsiveContainer width='100%' height={192}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.05)' vertical={false} />
                                <XAxis dataKey='name' tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                    tickFormatter={v => `${currency}${Math.round(v / 1000)}k`}
                                />
                                <Tooltip content={<CustomTooltip currency={currency} />} />
                                <Line type='monotone' dataKey='revenue' name='Revenue' stroke={AMBER} strokeWidth={2}
                                    dot={{ r: 3, fill: AMBER }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DoctorCharts