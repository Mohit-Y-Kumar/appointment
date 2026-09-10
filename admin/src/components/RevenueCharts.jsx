import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell
} from 'recharts'
import { C, PIE_COLORS, card, fmtR } from '../utils/DashboardUtils'
import { SectionLabel, RupeeTooltip } from './DashboardWidgets'

const RevenueCharts = ({ stats }) => {
  const [revPeriod, setRevPeriod] = useState('month')
  const revDocData = stats.revPerDoctor?.[revPeriod] || []

  return (
    <>
      <SectionLabel>Revenue Analytics</SectionLabel>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3'>

        {/* Daily Revenue */}
        <div className={card}>
          <p className='text-sm font-semibold text-slate-700'>Daily Revenue</p>
          <p className='text-xs text-slate-400 mb-4'>
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} — day‑by‑day earnings
          </p>
          {(stats.dailyRevenueData || []).every(d => d.revenue === 0) ? (
            <div className='flex items-center justify-center h-47.5 text-slate-300 text-sm'>
              No paid appointments this month yet
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={190}>
              <BarChart data={stats.dailyRevenueData || []} barSize={10}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
                <XAxis dataKey='day' tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  interval={Math.floor((stats.dailyRevenueData?.length || 30) / 10)} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => fmtR(v)} />
                <Tooltip content={<RupeeTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey='revenue' name='Revenue' radius={[3, 3, 0, 0]}>
                  {(stats.dailyRevenueData || []).map((d, i) => {
                    const maxRev = Math.max(...(stats.dailyRevenueData || [{ revenue: 1 }]).map(x => x.revenue), 1)
                    return <Cell key={i} fill={d.revenue >= maxRev * 0.8 ? C.primary : '#c7d2fe'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Trend */}
        <div className={card}>
          <div className='flex items-start justify-between mb-1'>
            <div>
              <p className='text-sm font-semibold text-slate-700'>Revenue Trend</p>
              <p className='text-xs text-slate-400 mb-3'>Monthly revenue vs target</p>
            </div>
            <div className='flex items-center gap-3 text-[10px] text-slate-500 mt-0.5'>
              <span className='flex items-center gap-1'>
                <span className='w-5 h-0.5 bg-primary inline-block rounded' />Revenue
              </span>
              <span className='flex items-center gap-1'>
                <span className='w-5 h-px border-t-2 border-dashed border-teal-500 inline-block' />Target
              </span>
            </div>
          </div>
          {(stats.revTrendData || []).every(d => d.revenue === 0) ? (
            <div className='flex items-center justify-center h-47.5 text-slate-300 text-sm'>
              No revenue data available yet
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={190}>
              <LineChart data={stats.revTrendData || []}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
                <XAxis dataKey='month' tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => fmtR(v)} />
                <Tooltip content={<RupeeTooltip />} />
                <ReferenceLine y={stats.target} stroke={C.teal} strokeDasharray='6 3' strokeWidth={1.5} />
                <Line type='monotone' dataKey='revenue' name='Revenue'
                  stroke={C.primary} strokeWidth={2.5}
                  dot={{ r: 3, fill: C.primary, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type='monotone' dataKey='target' name='Target'
                  stroke={C.teal} strokeWidth={1.5} strokeDasharray='6 3' dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue Per Doctor */}
      <div className={`${card} mb-3`}>
        <div className='flex items-center justify-between mb-3'>
          <div>
            <p className='text-sm font-semibold text-slate-700'>Revenue per Doctor</p>
            <p className='text-xs text-slate-400'>Toggle between This Week, monthly and yearly view</p>
          </div>
          <div className='flex gap-1.5'>
            {[{ key: 'day', label: 'This Week' }, { key: 'month', label: 'Monthly' }, { key: 'year', label: 'Yearly' }]
              .map(({ key, label }) => (
                <button key={key} onClick={() => setRevPeriod(key)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-all font-medium
                    ${revPeriod === key
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-primary'}`}>
                  {label}
                </button>
              ))}
          </div>
        </div>
        {revDocData.length === 0 ? (
          <div className='flex items-center justify-center h-50 text-slate-300 text-sm'>
            No paid appointments for this period
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={200}>
            <BarChart data={revDocData} barSize={32}>
              <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
              <XAxis dataKey='name' tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => fmtR(v)} />
              <Tooltip content={<RupeeTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey='revenue' name='Revenue' radius={[4, 4, 0, 0]}>
                {revDocData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  )
}

export default RevenueCharts
