import React from 'react'

const Title = ({ text1, text2 }) => {
  return (
    <div className='inline-flex gap-3 items-center mb-3 select-none'>
      <p className='uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500'>
        {text1} <span className='normal-case tracking-normal text-gray-800 font-semibold'>{text2}</span>
      </p>
      <p className='w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300'></p>
    </div>
  )
}

export default Title
