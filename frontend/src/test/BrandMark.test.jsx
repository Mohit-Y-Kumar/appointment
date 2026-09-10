import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import BrandMark from '../components/BrandMark'

test('renders a professional text-based brand mark without relying on a generated logo asset', () => {
  render(<BrandMark />)

  expect(screen.getByText('DocNest')).toBeInTheDocument()
  expect(screen.getByText('Healthcare')).toBeInTheDocument()
})
