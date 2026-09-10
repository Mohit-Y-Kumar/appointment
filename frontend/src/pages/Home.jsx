import React from 'react'
import Header from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'
import SymptomChecker from '../components/SymptomChecker'

const Home = () => {
  return (
    <div className='mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
      <Header />
      <SymptomChecker />
      <SpecialityMenu />
      <TopDoctors />
      <Banner />
    </div>
  )
}

export default Home