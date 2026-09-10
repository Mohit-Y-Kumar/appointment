import React from 'react'
import arrowUp   from '../assets/arrow-up.svg'
import arrowDown from '../assets/arrow-down.svg'

export const BRAND      = '#5F6FFF'
export const BRAND_DARK = '#1A1F5E'
export const BRAND_PINK = '#FF6B8A'
export const GREEN      = '#22c87a'
export const AMBER      = '#f59e0b'
export const RED        = '#ef4444'

export const AVATAR_BG = [
    { bg: '#eef0ff', color: BRAND_DARK },
    { bg: '#e8faf2', color: '#065f46'  },
    { bg: '#fff8e6', color: '#92400e'  },
    { bg: '#fff0f3', color: '#9f1239'  },
    { bg: '#f3e8ff', color: '#6b21a8'  },
]

export const DOT_COLORS = [BRAND, GREEN, BRAND_PINK, AMBER, RED, '#8b5cf6']

export const FILTER_TABS = [
    { key: 'all',       label: 'All',       color: BRAND, bg: '#eef0ff' },
    { key: 'pending',   label: 'Pending',   color: AMBER, bg: '#fff8e6' },
    { key: 'completed', label: 'Completed', color: GREEN, bg: '#e8faf2' },
    { key: 'cancelled', label: 'Cancelled', color: RED,   bg: '#fef2f2' },
]

export const Spinner = ({ color = BRAND }) => (
    <div className='h-48 flex items-center justify-center'>
        <div className='w-6 h-6 rounded-full border-2 border-t-transparent animate-spin'
            style={{ borderColor: `${color} ${color} ${color} transparent` }} />
    </div>
)

export const Avatar = ({ image, name, idx }) => {
    const av       = AVATAR_BG[idx % AVATAR_BG.length]
    const initials = (name ?? 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    return image
        ? <img src={image} className='w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white' alt='' />
        : <div className='w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0'
            style={{ background: av.bg, color: av.color }}>{initials}</div>
}

export const StatusBadge = ({ item }) => {
    if (item.cancelled)   return <span className='text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500'>Cancelled</span>
    if (item.isCompleted) return <span className='text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600'>Completed</span>
    return <span className='text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600'>Pending</span>
}

export const SectionDot = ({ color }) => (
    <span className='w-2 h-2 rounded-full shrink-0 inline-block' style={{ background: color }} />
)

export const CardHeader = ({ dot, title, right }) => (
    <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3'>
        <div className='flex items-center gap-2'>
            <SectionDot color={dot} />
            <span className='text-sm font-semibold text-slate-800'>{title}</span>
        </div>
        {right && <div>{right}</div>}
    </div>
)

export const PeriodTabs = ({ options, value, onChange }) => (
    <div className='flex gap-1 rounded-full bg-slate-100 p-1'>
        {options.map(p => (
            <button key={p} onClick={() => onChange(p)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition-all ${value === p
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700'}`}>
                {p}
            </button>
        ))}
    </div>
)

export const CustomTooltip = ({ active, payload, label, currency = '' }) => {
    if (!active || !payload?.length) return null
    return (
        <div className='rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm'>
            <p className='mb-1 font-semibold text-slate-700'>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>{p.name}: {currency}{p.value?.toLocaleString()}</p>
            ))}
        </div>
    )
}

export const MetricCard = ({ label, value, upText, sub, accentColor, icon }) => (
    <div className='group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_12px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(79,70,229,0.10)]'>
        <div className='absolute inset-x-0 top-0 h-1' style={{ background: accentColor }} />
        <div className='mb-3 flex items-center justify-between'>
            <span className='text-[10px] font-bold uppercase tracking-[0.18em]' style={{ color: accentColor }}>{label}</span>
            {icon && (
                <div className='flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110'
                    style={{ background: `${accentColor}18` }}>
                    <img src={icon} className='h-5 w-5 object-contain' alt='' />
                </div>
            )}
        </div>
        <div className='mb-1 text-3xl font-bold tracking-tight' style={{ color: BRAND_DARK }}>{value}</div>
        <div className='flex flex-wrap items-center gap-1 text-[11px] text-slate-500'>
            {upText && <span className='flex items-center gap-1'>{upText}</span>}
            {sub && <span className='text-slate-500'>{sub}</span>}
        </div>
    </div>
)

export const HealthBar = ({ label, value, color }) => (
    <div className='flex items-center gap-3 py-2 border-b border-gray-50 last:border-0'>
        <span className='text-xs text-gray-500 w-28 shrink-0'>{label}</span>
        <div className='flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden'>
            <div className='h-full rounded-full transition-all duration-700' style={{ width: `${value}%`, background: color }} />
        </div>
        <span className='text-xs font-semibold text-gray-700 w-8 text-right'>{value}%</span>
    </div>
)

export const makeTrendUI = (value) => {
    if (value === null || value === undefined) return null
    return (
        <div className='flex items-center gap-1'>
            <img src={value >= 0 ? arrowUp : arrowDown} alt='trend' className='w-3 h-3' />
            <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>{Math.abs(value)}%</span>
        </div>
    )
}