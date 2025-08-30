import React from 'react'
import Title from '../components/Title'

export default function NotFound() {
  return (
    <div className='border-t pt-16 px-4 text-center'>
      <Title text1={'PAGE'} text2={'NOT FOUND'} />
      <p className='text-gray-600 mt-2 text-sm'>The page you’re looking for doesn’t exist.</p>
      <a href='/' className='inline-block mt-6 px-5 py-3 border rounded hover:bg-gray-50 text-sm'>Go Home</a>
    </div>
  )
}

