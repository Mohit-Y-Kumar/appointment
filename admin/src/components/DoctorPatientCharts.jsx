import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { PIE_COLORS, TS, card, fmtR } from '../utils/DashboardUtils'
import { SectionLabel, renderPieLabel } from './DashboardWidgets'

const DoctorPatientCharts = ({ stats, dashData, doctors }) => {
  return (
    <>
      <SectionLabel>Doctors &amp; Patients</SectionLabel>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3'>

        {/* Top Doctors */}
        <div className={`${card} lg:col-span-2`}>
          <p className='text-sm font-semibold text-slate-700'>Top Doctors by Appointments</p>
          <p className='text-xs text-slate-400 mb-4'>Ranked by booking count</p>
          <ResponsiveContainer width='100%' height={190}>
            <BarChart data={stats.topDoctors || []} layout='vertical' barSize={18} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' horizontal={false} />
              <XAxis type='number' tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type='category' dataKey='name' tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false} tickLine={false} width={90} />
              <Tooltip {...TS} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey='count' radius={[0, 4, 4, 0]}>
                {(stats.topDoctors || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Split */}
        <div className={card}>
          <p className='text-sm font-semibold text-slate-700'>Patient Gender Split</p>
          <p className='text-xs text-slate-400 mb-1'>From appointment records</p>
          <ResponsiveContainer width='100%' height={200}>
            <PieChart>
              <Pie data={stats.genderData || []} cx='50%' cy='42%'
                innerRadius={50} outerRadius={76} paddingAngle={3}
                dataKey='value' labelLine={false} label={renderPieLabel}>
                {(stats.genderData || []).map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend iconSize={8} iconType='circle'
                formatter={v => <span style={{ fontSize: 10, color: '#64748b' }}>{v}</span>} />
              <Tooltip {...TS} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Speciality + Stat Tiles */}
      {(stats.specData || []).length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3'>
          <div className={card}>
            <p className='text-sm font-semibold text-slate-700'>Appointments by Speciality</p>
            <p className='text-xs text-slate-400 mb-1'>Department distribution</p>
            <ResponsiveContainer width='100%' height={210}>
              <PieChart>
                <Pie data={stats.specData || []} cx='50%' cy='42%'
                  outerRadius={70} paddingAngle={2}
                  dataKey='value' labelLine={false} label={renderPieLabel}>
                  {(stats.specData || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend iconSize={8} iconType='circle'
                  formatter={v => <span style={{ fontSize: 9, color: '#64748b' }}>
                    {v.length > 13 ? v.slice(0, 13) + '…' : v}
                  </span>} />
                <Tooltip {...TS} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className='lg:col-span-2 grid grid-cols-2 gap-3'>
            {[
              { label: 'Cancellation Rate',  value: stats.total ? ((stats.cancelled / stats.total) * 100).toFixed(1) + '%' : '0%', color: 'text-red-500',     bg: 'bg-red-50'     },
              { label: 'Completion Rate',    value: stats.total ? ((stats.completed / stats.total) * 100).toFixed(1) + '%' : '0%', color: 'text-teal-600',    bg: 'bg-teal-50'    },
              { label: 'Paid Revenue Collected',  value: fmtR(stats.revenue || 0),                                                       color: 'text-primary',     bg: 'bg-blue-50'     },
              { label: 'Available Doctors',  value: (doctors || []).filter(d => d.available).length,                                color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Paid Appointments',  value: stats.paid || 0,                                                                color: 'text-sky-600',     bg: 'bg-sky-50'     },
              { label: 'Total Doctors',      value: dashData.doctors,                                                               color: 'text-violet-600',  bg: 'bg-violet-50'  },
            ].map(s => (
              <div key={s.label} className={`${card} ${s.bg} border-0`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className='text-xs text-slate-500 mt-1'>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default DoctorPatientCharts
