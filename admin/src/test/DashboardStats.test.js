import { expect, test } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardStats } from '../utils/DashboardStats'

const appointments = [
  { cancelled: true, payment: true, amount: 1000, slotDate: '1_1_2099' },
  { cancelled: false, isCompleted: true, payment: true, amount: 2000, slotDate: '2_1_2099' },
  { cancelled: false, isCompleted: false, payment: true, amount: 1500, slotDate: '3_1_2099' },
  { cancelled: false, isCompleted: false, payment: false, amount: 500, slotDate: '4_1_2099' },
]

test('keeps dashboard status counts mutually exclusive', () => {
  const { result } = renderHook(() => useDashboardStats(appointments, []))
  const stats = result.current

  expect(stats.total).toBe(4)
  expect(stats.cancelled).toBe(1)
  expect(stats.completed).toBe(1)
  expect(stats.paid).toBe(1)
  expect(stats.pending).toBe(1)
  expect(stats.cancelled + stats.completed + stats.paid + stats.pending).toBe(stats.total)
})

test('excludes cancelled appointments from revenue', () => {
  const { result } = renderHook(() => useDashboardStats(appointments, []))

  expect(result.current.revenue).toBe(3500)
})
