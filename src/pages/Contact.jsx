import React, { useState } from 'react'
import Title from '../components/Title'

const Contact = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    const text = `Hello Solo Wardrobe,%0A%0AName: ${encodeURIComponent(name)}%0AEmail: ${encodeURIComponent(email)}%0A%0A${encodeURIComponent(message)}`
    const href = `https://wa.me/919933778870?text=${text}`
    window.open(href, '_blank', 'noopener')
  }

  return (
    <div className='border-t'>
      <div className='text-center text-2xl pt-10'>
        <Title text1={'CONTACT'} text2={'SOLO WARDROBE'} />
      </div>

      <div className='max-w-6xl mx-auto px-4 my-10 grid md:grid-cols-2 gap-10 items-start'>
        <div className='space-y-6 md:col-span-2'>
          <div className='animate-soft-reveal'>
            <h3 className='text-lg font-semibold'>We’re here to help</h3>
            <p className='text-gray-600 text-sm mt-2'>Questions about fit, shipping, or a product? Drop us a note and we’ll get back quickly.</p>
          </div>

          <div className='grid sm:grid-cols-2 gap-4 text-sm animate-soft-reveal' style={{animationDelay:'80ms'}}>
            <div className='border rounded-md p-4 bg-white'>
              <p className='text-gray-500'>WhatsApp</p>
              <p className='font-medium mt-1'>+91 99337 78870</p>
            </div>
            <div className='border rounded-md p-4 bg-white'>
              <p className='text-gray-500'>Email</p>
              <p className='font-medium mt-1'>thesolowardrobe@gmail.com</p>
            </div>
            <div className='border rounded-md p-4 bg-white'>
              <p className='text-gray-500'>Hours</p>
              <p className='font-medium mt-1'>Mon–Sat, 10:00–18:00</p>
            </div>
            <div className='border rounded-md p-4 bg-white'>
              <p className='text-gray-500'>Location</p>
              <p className='font-medium mt-1'>Ahmedabad, Gujarat</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className='border rounded-md p-5 bg-white animate-soft-reveal' style={{animationDelay:'160ms'}}>
            <div className='grid sm:grid-cols-2 gap-3'>
              <input className='border rounded px-3 h-11' placeholder='Your name' value={name} onChange={(e)=>setName(e.target.value)} required />
              <input className='border rounded px-3 h-11' placeholder='Your email (optional)' type='email' value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <textarea className='border rounded px-3 py-2 h-28 w-full mt-3' placeholder='How can we help?' value={message} onChange={(e)=>setMessage(e.target.value)} required />
            <div className='mt-3 text-right'>
              <button type='submit' className='px-6 py-3 rounded bg-black text-white text-sm hover:opacity-90'>Send on WhatsApp</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Contact
