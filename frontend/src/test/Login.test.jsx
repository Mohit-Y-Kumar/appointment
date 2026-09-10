import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import Login from '../pages/Login'

const renderLogin = () => render(
  <MemoryRouter>
    <AppContext.Provider value={{ backendUrl: '', token: false, setToken: () => {} }}>
      <Login />
    </AppContext.Provider>
  </MemoryRouter>
)

test('renders sign-up mode and switches to login mode', () => {
  renderLogin()

  expect(screen.getByText('Create Account', { selector: 'p' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  expect(screen.getByLabelText('Full Name')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Login here'))

  expect(screen.getByText('Login', { exact: true, selector: 'p' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument()
})
