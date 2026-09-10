import React from 'react'
import { card, TS, fmtR } from '../utils/DashboardUtils'

export function SectionLabel({ children }) {
  return (
    <p className='text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3 mt-6'>
      {children}
    </p>
  )
}

export function MetricCard({ icon, label, value, sub, subColor = 'text-emerald-600', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`${card} group flex items-center gap-3 ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(79,70,229,0.12)]' : ''} transition-all duration-200 min-w-0 overflow-hidden`}
    >
      <div
        className='w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-white/70 shadow-inner'
        style={{ background: icon.bg }}
      >
        <img src={icon.emoji} alt='' className='w-5 h-5 sm:w-6 sm:h-6 object-contain' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-xl sm:text-2xl font-bold text-slate-800 leading-tight tracking-tight'>{value ?? '—'}</p>
        <p className='text-[11px] sm:text-xs text-slate-500 mt-1 leading-tight wrap-break-words'>{label}</p>
        {sub && (
          <p className={`text-[10px] sm:text-xs font-medium mt-1 leading-tight wrap-break-words ${subColor}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * R)
  const y = cy + r * Math.sin(-midAngle * R)
  return (
    <text x={x} y={y} fill='#fff' textAnchor='middle'
      dominantBaseline='central' fontSize={10} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export function RupeeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TS.contentStyle} className='px-3 py-2'>
      <p className='text-slate-500 text-[11px] mb-1'>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className='font-semibold text-[11px]'>
          {p.name}: {fmtR(p.value)}
        </p>
      ))}
    </div>
  )
}
