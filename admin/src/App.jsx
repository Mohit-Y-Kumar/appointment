import React, { useContext } from 'react'
import Login from './pages/Login'
import { ToastContainer } from 'react-toastify';
import { AdminContext } from './context/AdminContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Admin/Dashboard';
import AllApointments from './pages/Admin/AllApointments';
import AddDoctor from './pages/Admin/AddDoctor';
import DoctorList from './pages/Admin/DoctorList';
import { DoctorContext } from './context/DoctorContext';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import DoctorAppointments from './pages/Doctor/DoctorAppointments';
import DoctorProfile from './pages/Doctor/DoctorProfile';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  const { aToken, authReady: adminAuthReady } = useContext(AdminContext)
  const { dToken, authReady: doctorAuthReady } = useContext(DoctorContext)
  const authReady = adminAuthReady || doctorAuthReady

  return (
    <ErrorBoundary>
      {!authReady ? (
        <div className='min-h-screen flex items-center justify-center bg-[#F8F9FD] text-slate-500'>Checking session...</div>
      ) : aToken || dToken ? (
        <div className='min-h-screen bg-[#F8F9FD]'>
          <ToastContainer />

          <div className='fixed top-0 left-0 right-0 z-40'>
            <Navbar />
          </div>

          <div className='flex min-h-screen pt-14'>
            <Sidebar />
            <main className='ml-16 min-h-[calc(100vh-3.5rem)] min-w-0 flex-1 overflow-y-auto md:ml-56'>
              <Routes>
                {/* Admin routes */}
                <Route path='/' element={<></>} />
                <Route path='/admin-dashboard' element={<Dashboard />} />
                <Route path='/all-appointments' element={<AllApointments />} />
                <Route path='/add-doctor' element={<AddDoctor />} />
                <Route path='/doctor-list' element={<DoctorList />} />

                {/* Doctor routes */}
                <Route path='/doctor-dashboard' element={<DoctorDashboard />} />
                <Route path='/doctor-appointments' element={<DoctorAppointments />} />
                <Route path='/doctor-profile' element={<DoctorProfile />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        <>
          <Login />
          <ToastContainer />
        </>
      )}
    </ErrorBoundary>
  )
}

export default App