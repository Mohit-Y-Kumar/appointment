import React from 'react'
import { assets } from '../assets/assets'

const About = () => {
  return (
    <div className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
      <div className='pt-10 text-center sm:pt-14'>
        <p className='text-2xl text-slate-500 sm:text-3xl'>
          About <span className='font-semibold text-slate-900'>DocNest</span>
        </p>
      </div>

      <div className='my-10 flex flex-col items-center gap-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:my-14 sm:p-8 md:flex-row md:gap-12'>
        <img
          className='w-full max-w-sm rounded-[24px] object-cover shadow-[0_20px_40px_rgba(59,130,246,0.14)] md:max-w-[420px]'
          src={assets.about_image}
          alt='About DocNest'
          loading='lazy'
        />

        <div className='flex flex-col justify-center gap-5 text-sm leading-7 text-slate-600 sm:text-base'>
          <p>
            Welcome to <span className='font-medium text-slate-800'>DocNest</span>, a modern healthcare platform
            built to simplify appointment booking and connect patients with trusted medical professionals
            across a wide range of specialties.
          </p>
          <p>
            We understand the importance of timely care, clear communication, and a seamless patient experience.
            Our platform is designed to reduce friction while improving access to quality healthcare services.
          </p>
          <p>
            Through thoughtful digital experiences and reliable clinical coordination, we aim to make healthcare
            more accessible, efficient, and patient-centered.
          </p>
          <div className='rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100'>
            <p className='mb-1 font-semibold text-slate-800'>Our Vision</p>
            <p>
              To build a connected healthcare ecosystem where patients can easily access trusted care, manage
              appointments with confidence, and receive support when they need it most.
            </p>
          </div>
        </div>
      </div>

      <p className='mb-5 text-xl font-semibold text-slate-700 sm:text-2xl'>Why Choose Us</p>

      <div className='mb-20 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3'>
        {[
          {
            title: 'Efficiency',
            desc: 'Book appointments in seconds with our fast and streamlined system.'
          },
          {
            title: 'Convenience',
            desc: 'Access a wide network of trusted doctors from the comfort of your home.'
          },
          {
            title: 'Personalization',
            desc: 'Get personalized recommendations and reminders for better healthcare management.'
          }
        ].map((card, i) => (
          <div
            key={i}
            className='group flex cursor-default flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-6 py-8 shadow-[0_16px_35px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-gradient-to-br hover:from-primary hover:to-accent hover:text-white hover:shadow-[0_20px_40px_rgba(59,130,246,0.18)] sm:px-8 sm:py-10'
          >
            <b className='text-base sm:text-lg'>{card.title}</b>
            <p className='text-sm text-slate-600 transition-colors group-hover:text-white sm:text-base'>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default About