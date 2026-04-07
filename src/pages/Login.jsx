import React from 'react'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const navigate = useNavigate();

    return (
        <div className='flex flex-col items-center w-[90%] sm:max-w-md m-auto mt-14 gap-4 text-gray-800 min-h-[60vh] justify-center pb-20 md:pb-0'>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <h1 className='font-serif text-2xl'>Account Coming Soon</h1>
            <p className='text-gray-600 text-center max-w-sm'>
                We're working on user accounts. For now, all orders are placed directly via WhatsApp — no login needed.
            </p>
            <div className='flex flex-col sm:flex-row gap-3 mt-4'>
                <Button onClick={() => navigate('/collection')}>
                    Browse Collection
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const phone = import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || '919933778870';
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Hello!')}`, '_blank');
                    }}
                >
                    Chat on WhatsApp
                </Button>
            </div>
        </div>
    )
}

export default Login
