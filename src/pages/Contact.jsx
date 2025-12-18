import React, { useState } from 'react'
import Title from '../components/Title'
import Button from '../components/Button'
import Input from '../components/Input'
import { validateName, validateEmail, validateMessage } from '../utils/validation'

const Contact = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {};
    const nameError = validateName(name, 'Name');
    if (nameError) errs.name = nameError;
    
    const emailError = validateEmail(email);
    if (emailError) errs.email = emailError;
    
    const messageError = validateMessage(message, 'Message', 10);
    if (messageError) errs.message = messageError;
    
    return errs;
  };

  const onChange = (field, value) => {
    if (field === 'name') setName(value);
    else if (field === 'email') setEmail(value);
    else if (field === 'message') setMessage(value);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const onSubmit = (e) => {
    e.preventDefault()
    const errs = validate();
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    
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
              <Input 
                placeholder='Your name' 
                name="name"
                value={name} 
                onChange={(e) => onChange('name', e.target.value)} 
                error={!!errors.name}
                errorMessage={errors.name}
                required 
                className="h-11" 
              />
              <Input 
                placeholder='Your email (optional)' 
                type='email' 
                name="email"
                value={email} 
                onChange={(e) => onChange('email', e.target.value)} 
                error={!!errors.email}
                errorMessage={errors.email}
                className="h-11" 
              />
            </div>
            <div className="mt-3">
              <textarea 
                className={`border rounded-lg px-4 py-3 h-28 w-full text-sm outline-none transition-colors focus:ring-2 ${
                  errors.message 
                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-200 focus:border-primary focus:ring-primary/20'
                }`}
                placeholder='How can we help?' 
                name="message"
                value={message} 
                onChange={(e) => onChange('message', e.target.value)} 
                required 
                aria-invalid={errors.message ? 'true' : 'false'}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && (
                <p id="message-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.message}
                </p>
              )}
            </div>
            <div className='mt-3 text-right'>
              <Button type='submit'>Send on WhatsApp</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Contact
