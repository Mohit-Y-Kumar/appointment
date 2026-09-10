import React from 'react'
import { assets } from '../assets/assets'

const Contact = () => {
  return (
    <div className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
      <div className='pt-10 text-center sm:pt-14'>
        <p className='text-2xl text-slate-500 sm:text-3xl'>
          Contact <span className='font-semibold text-slate-900'>DocNest</span>
        </p>
      </div>

      <div className='my-10 flex flex-col items-center gap-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:my-14 sm:p-8 md:flex-row md:gap-12'>
        <img
          className='w-full max-w-sm rounded-[24px] object-cover shadow-[0_20px_40px_rgba(15,23,42,0.12)] md:max-w-[420px]'
          src={assets.contact_image}
          alt='Contact DocNest'
          loading='lazy'
        />

        <div className='flex w-full flex-col items-start justify-center gap-6 text-slate-600'>
          <div className='rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100'>
            <p className='text-base font-semibold text-slate-800 sm:text-lg'>Our Office</p>
            <p className='mt-2 text-sm leading-6 text-slate-500 sm:text-base'>
              546, Gaur City, 5th Floor <br />
              Noida, India
            </p>
          </div>

          <div className='rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100'>
            <p className='text-base font-semibold text-slate-800 sm:text-lg'>Contact Information</p>
            <p className='mt-2 text-sm leading-6 text-slate-500 sm:text-base'>
              Phone:{' '}
              <a href='tel:+919876543210' className='text-primary transition hover:text-primary/80'>
                +91 98765 43210
              </a>
              <br />
              Email:{' '}
              <a href='mailto:support@docnest.com' className='text-primary transition hover:text-primary/80'>
                support@docnest.com
              </a>
            </p>
          </div>

          <div className='rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100'>
            <p className='text-base font-semibold text-slate-800 sm:text-lg'>Careers at DocNest</p>
            <p className='mt-2 text-sm text-slate-500 sm:text-base'>
              Join our team and help shape the future of patient-centered healthcare.
            </p>
          </div>

          <a
            href='mailto:careers@docnest.com'
            className='mt-1 inline-block rounded-full border border-slate-800 bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 sm:px-8 sm:py-3'
          >
            Explore Jobs &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}

export default Contact