const BrandMark = ({ className = '', compact = false }) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className='relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-sky-600 to-cyan-500 shadow-sm ring-1 ring-sky-200/80'>
        <span className='absolute h-4 w-1 rounded-full bg-white' />
        <span className='absolute h-1 w-4 rounded-full bg-white' />
      </div>

      <div className='leading-none'>
        <span className={`block font-semibold tracking-tight text-slate-900 ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>
          DocNest
        </span>
        <span className='block text-[9px] font-medium uppercase tracking-[0.28em] text-slate-500'>Healthcare</span>
      </div>
    </div>
  )
}

export default BrandMark
