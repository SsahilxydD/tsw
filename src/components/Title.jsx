import React from 'react'

const Title = ({ text1, text2, text2ClassName }) => {
  return (
    <div className='inline-flex gap-3 items-center mb-1 select-none'>
      <p className='uppercase tracking-[0.18em] text-[11px] sm:text-xs text-black font-medium'>
        {text1} <span className={`normal-case tracking-normal font-semibold ${text2ClassName || 'text-black'}`}>{text2}</span>
      </p>
      <p className='w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-800'></p>
    </div>
  )
}

export default Title
