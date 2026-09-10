import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AdminContext } from '../context/AdminContext'
import { DoctorContext } from '../context/DoctorContext'
import Login from '../pages/Login'

const renderLogin = () => render(
  <AdminContext.Provider value={{ setAToken: () => {}, backendUrl: '' }}>
    <DoctorContext.Provider value={{ setDToken: () => {} }}>
      <Login />
    </DoctorContext.Provider>
  </AdminContext.Provider>
)

test('renders admin login and switches to doctor login', () => {
  renderLogin()

  expect(screen.getByText('Admin', { exact: false })).toBeInTheDocument()
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Click here' }))
  expect(screen.getByText('Doctor', { exact: false })).toBeInTheDocument()
})
