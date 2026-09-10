import { useMemo } from 'react'
import { C, PIE_COLORS, parseSlot } from './DashboardUtils'

export const useDashboardStats = (appointments, doctors) => {
  return useMemo(() => {
    const appts = appointments || []
    const docs  = doctors || []

    const total     = appts.length
    const cancelled = appts.filter(a => a.cancelled).length
    const completed = appts.filter(a => !a.cancelled && a.isCompleted).length
    const paid      = appts.filter(a => !a.cancelled && a.payment && !a.isCompleted).length
    const pending   = appts.filter(a => !a.cancelled && !a.isCompleted && !a.payment).length
    const revenue   = appts
      .filter(a => !a.cancelled && a.payment)
      .reduce((s, a) => s + (a.amount || 0), 0)

    const now          = new Date()
    const todayDay     = now.getDate()
    const todayMo      = now.getMonth() + 1
    const todayYr      = now.getFullYear()
    const currentMoStr = String(todayMo)
    const currentYrStr = String(todayYr)

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const cancelledToday = appts.filter(a => {
      if (!a.cancelled) return false
      const s = parseSlot(a.slotDate)
      if (!s) return false
      return (
        parseInt(s.day, 10) === todayDay &&
        parseInt(s.mo,  10) === todayMo  &&
        parseInt(s.yr,  10) === todayYr
      )
    }).length

    const bookedToday = appts.filter(a => a.date && new Date(a.date) >= startOfDay).length

    const rated     = docs.filter(d => d.averageRating > 0)
    const avgRating = rated.length
      ? (rated.reduce((s, d) => s + d.averageRating, 0) / rated.length).toFixed(1)
      : null

    // ── Monthly appointments — last 6 months ──
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(1)
      d.setMonth(now.getMonth() - i)
      const mo  = String(d.getMonth() + 1)
      const yr  = String(d.getFullYear())
      const lbl = d.toLocaleString('default', { month: 'short' })
      const cnt = appts.filter(a => {
        const s = parseSlot(a.slotDate)
        return s && s.mo === mo && s.yr === yr
      }).length
      monthlyData.push({ month: lbl, appointments: cnt })
    }

    // ── Status pie ──
    const statusData = [
      { name: 'Confirmed', value: paid,      color: C.sky   },
      { name: 'Pending',   value: pending,   color: C.amber },
      { name: 'Cancelled', value: cancelled, color: C.rose  },
      { name: 'Completed', value: completed, color: C.teal  },
    ].filter(d => d.value > 0)

    // ── Gender pie ──
    const gMap = { Male: 0, Female: 0, Other: 0 }
    appts.forEach(a => {
      const g = a.userData?.gender
      if (g === 'Male')        gMap.Male++
      else if (g === 'Female') gMap.Female++
      else                     gMap.Other++
    })
    const genderData = [
      { name: 'Male',   value: gMap.Male,   color: C.sky  },
      { name: 'Female', value: gMap.Female, color: C.pink },
      { name: 'Other',  value: gMap.Other,  color: C.slate },
    ].filter(d => d.value > 0)

    // ── Speciality pie ──
    const spMap = {}
    appts.forEach(a => {
      const sp = a.docData?.speciality || 'General'
      spMap[sp] = (spMap[sp] || 0) + 1
    })
    const specData = Object.entries(spMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }))

    // ── Top 5 doctors by bookings ──
    const docMap = {}
    appts.forEach(a => {
      const nm = a.docData?.name || 'Unknown'
      docMap[nm] = (docMap[nm] || 0) + 1
    })
    const topDoctors = Object.entries(docMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // ── Daily revenue — current month ──
    const dailyMap = {}
    appts.filter(a => !a.cancelled && a.payment).forEach(a => {
      const s = parseSlot(a.slotDate)
      if (!s || s.mo !== currentMoStr || s.yr !== currentYrStr) return
      const day = parseInt(s.day, 10)
      dailyMap[day] = (dailyMap[day] || 0) + (a.amount || 0)
    })
    const daysInMonth      = new Date(todayYr, todayMo, 0).getDate()
    const dailyRevenueData = Array.from(
      { length: Math.min(daysInMonth, todayDay) },
      (_, i) => ({ day: String(i + 1), revenue: dailyMap[i + 1] || 0 })
    )

    // ── Revenue trend — last 6 months ──
    const revTrendData      = []
    let   totalMonthRevenue = 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(1)
      d.setMonth(now.getMonth() - i)
      const mo      = String(d.getMonth() + 1)
      const yr      = String(d.getFullYear())
      const lbl     = d.toLocaleString('default', { month: 'short' })
      const monthRev = appts
        .filter(a => {
          if (a.cancelled || !a.payment) return false
          const s = parseSlot(a.slotDate)
          return s && s.mo === mo && s.yr === yr
        })
        .reduce((s, a) => s + (a.amount || 0), 0)
      totalMonthRevenue += monthRev
      revTrendData.push({ month: lbl, revenue: monthRev })
    }
    const avgMonthRev = totalMonthRevenue / 6
    const target      = Math.round(avgMonthRev * 1.1) || 5000
    revTrendData.forEach(d => { d.target = target })

    // ── Revenue per doctor ──
    const paidAppts = appts.filter(a => a.payment && !a.cancelled)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const dayDocMap = {}
    paidAppts
      .filter(a => {
        const s = parseSlot(a.slotDate)
        if (!s) return false
        const apptDate = new Date(parseInt(s.yr, 10), parseInt(s.mo, 10) - 1, parseInt(s.day, 10))
        return apptDate >= weekStart
      })
      .forEach(a => {
        const nm = a.docData?.name || 'Unknown'
        dayDocMap[nm] = (dayDocMap[nm] || 0) + (a.amount || 0)
      })

    const monthDocMap = {}
    paidAppts
      .filter(a => { const s = parseSlot(a.slotDate); return s && s.mo === currentMoStr && s.yr === currentYrStr })
      .forEach(a => {
        const nm = a.docData?.name || 'Unknown'
        monthDocMap[nm] = (monthDocMap[nm] || 0) + (a.amount || 0)
      })

    const yearDocMap = {}
    paidAppts
      .filter(a => { const s = parseSlot(a.slotDate); return s && s.yr === currentYrStr })
      .forEach(a => {
        const nm = a.docData?.name || 'Unknown'
        yearDocMap[nm] = (yearDocMap[nm] || 0) + (a.amount || 0)
      })

    const buildDocRevData = (map) =>
      Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, revenue]) => ({ name, revenue }))

    const revPerDoctor = {
      day:   buildDocRevData(dayDocMap),
      month: buildDocRevData(monthDocMap),
      year:  buildDocRevData(yearDocMap),
    }

    return {
      total, cancelled, completed, paid, pending, revenue,
      cancelledToday, bookedToday, avgRating,
      monthlyData, statusData, genderData, specData, topDoctors,
      dailyRevenueData, revTrendData, revPerDoctor, target,
    }
  }, [appointments, doctors])
}
