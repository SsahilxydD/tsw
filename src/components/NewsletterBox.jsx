import React, { useState } from 'react'
import Button from './Button'
import Input from './Input'
import { validateEmail } from '../utils/validation'

const NewsletterBox = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    const emailError = validateEmail(email)
    
    if (emailError) {
      setError(emailError)
      return
    }
    
    // Form is valid - handle subscription
    // TODO: Implement actual newsletter subscription
    console.log('Newsletter subscription:', email)
    setSubmitted(true)
    setEmail('')
    setError(null)
    
    // Reset success message after 3 seconds
    setTimeout(() => setSubmitted(false), 3000)
  }

  const onChange = (e) => {
    setEmail(e.target.value)
    if (error) setError(null)
  }

  return (
    <div className='text-center'>

      <p className='text-2xl font-medium text-gray-800'>Subscribe now & get 20% off</p>
      <p className='text-gray-400 mt-3'>Lorem Ipsum is simply dummy text of the printing and typesetting industry. </p>

      {submitted ? (
        <div className="w-full sm:w-1/2 mx-auto my-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Thank you for subscribing!</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className='w-full sm:w-1/2 flex flex-col sm:flex-row items-start sm:items-center gap-3 mx-auto my-6 border border-gray-200 rounded-lg pl-3 overflow-hidden'>
          <div className="flex-1 w-full">
            <Input 
              type="email" 
              name="email"
              placeholder='Enter your email id' 
              value={email}
              onChange={onChange}
              error={!!error}
              errorMessage={error}
              required 
              className="border-0 h-auto py-4 focus:ring-0" 
            />
          </div>
          <Button type='submit' size="sm" className="rounded-none sm:rounded-r-lg">SUBSCRIBE</Button>
        </form>
      )}

    </div>
  )
}

export default NewsletterBox
