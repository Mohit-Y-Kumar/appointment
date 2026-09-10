import React, { useContext } from 'react'
import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Contact from './pages/Contact'
import MyProfile from './pages/MyProfile'
import MyAppointments from './pages/MyAppointments'
import Navbar from './components/Navbar'
import About from './pages/About'
import Appointment from './pages/Appointment'
import Footer from './components/Footer'
import { ToastContainer } from 'react-toastify';
import Chatbot from './components/Chatbot'
import ErrorBoundary from './components/ErrorBoundary'
import { AppContext } from './context/AppContext'

const ProtectedRoute = ({ children }) => {
  const { token, authReady } = useContext(AppContext)
  const location = useLocation()

  if (!authReady) {
    return <div className='min-h-screen flex items-center justify-center bg-slate-50 text-slate-500'>Checking session...</div>
  }

  if (!token) {
    return <Navigate to='/login' replace state={{ from: location }} />
  }

  return children
}

const App = () => {
  return (
    <ErrorBoundary>
      <div className='min-h-screen overflow-x-hidden bg-transparent text-slate-800'>
        <ToastContainer
          position='top-right'
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme='light'
        />
        <Navbar/>
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/doctors' element={<Doctors/>} />
          <Route path='/doctors/:speciality' element={<Doctors/>} />
          <Route path='/login' element={<Login/>} />
          <Route path='/verify-email' element={<VerifyEmail/>} />
          <Route path='/forgot-password' element={<ForgotPassword/>} />
          <Route path='/reset-password' element={<ResetPassword/>} />
          <Route path='/about' element={<About/>} />
          <Route path='/contact' element={<Contact/>} />
          <Route path='/my-profile' element={<ProtectedRoute><MyProfile/></ProtectedRoute>} />
          <Route path='/my-appointments' element={<ProtectedRoute><MyAppointments/></ProtectedRoute>} />
          <Route path='/appointment/:docId' element={<ProtectedRoute><Appointment/></ProtectedRoute>} />
          <Route path='/appointment/:id' element={<ProtectedRoute><Appointment/></ProtectedRoute>} />
        </Routes>
        <Footer />
        <Chatbot/>
      </div>
    </ErrorBoundary>
  )
}

export default App
