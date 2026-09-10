import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Header from '../components/Header'

test('renders the homepage hero with complete contained doctor figures', () => {
  render(<Header />)

  expect(screen.getByText('Find & Book Trusted Doctors Instantly')).toBeInTheDocument()
  const images = screen.getAllByTestId('hero-doctor')
  expect(screen.getByAltText('Doctor illustration')).toHaveClass('object-contain')
  expect(images).toHaveLength(5)
  expect(images.every(image => image.className.includes('object-contain'))).toBe(true)
})
