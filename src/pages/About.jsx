import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'

const About = () => {
  return (
    <div className='border-t'>
      {/* Intro */}
      <section className='max-w-6xl mx-auto px-4 pt-10'>
        <div className='text-center text-2xl mb-8'>
          <Title text1={'ABOUT'} text2={'SOLO WARDROBE'} />
        </div>

        <div className='grid md:grid-cols-2 gap-10 items-center'>
          <img className='w-full rounded-md border animate-soft-reveal' src={assets.about_img} alt="Solo Wardrobe" />
          <div className='text-gray-700 space-y-5 animate-soft-reveal'>
            <h2 className='text-xl font-semibold'>The Story</h2>
            <p>
              Solo Wardrobe began as a tiny drop—one rack, a handful of styles, and a belief that
              great pieces don’t need loud logos to feel special. We curate limited drops that are
              easy to wear, easy to love, and built to last beyond a season.
            </p>
            <p>
              Every product on our store is hand‑picked from trusted makers and carefully checked for
              fit, finish, and fabric. We keep inventory sharp, photography honest, and prices fair—
              so what you see is exactly what you get.
            </p>
            <p>
              The goal is simple: help you build a wardrobe you actually reach for. No noise. No
              clutter. Just good pieces.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className='max-w-6xl mx-auto px-4 mt-12'>
        <div className='text-center mb-6'>
          <Title text1={'WHAT'} text2={'WE BELIEVE'} />
        </div>
        <div className='grid md:grid-cols-3 gap-6 text-sm'>
          <div className='border rounded-md p-6 bg-white animate-soft-reveal'>
            <h3 className='font-semibold mb-2'>Fewer, Better</h3>
            <p className='text-gray-600'>We ship fewer styles, but we obsess over the details—fabric, stitching, feel and fit.</p>
          </div>
          <div className='border rounded-md p-6 bg-white animate-soft-reveal' style={{animationDelay:'80ms'}}>
            <h3 className='font-semibold mb-2'>Honest Pricing</h3>
            <p className='text-gray-600'>We keep the markup tight and the storytelling tighter. Value without the fluff.</p>
          </div>
          <div className='border rounded-md p-6 bg-white animate-soft-reveal' style={{animationDelay:'160ms'}}>
            <h3 className='font-semibold mb-2'>Made to Wear</h3>
            <p className='text-gray-600'>Pieces that move with you and slot into your day—work, coffee, weekend, repeat.</p>
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className='max-w-6xl mx-auto px-4 mt-12'>
        <div className='text-center mb-6'>
          <Title text1={'HOW'} text2={'WE WORK'} />
        </div>
        <div className='grid md:grid-cols-3 gap-6 text-sm'>
          <div className='border rounded-md p-6 bg-white animate-soft-reveal'>
            <p className='text-gray-400 text-xs'>01</p>
            <h4 className='font-semibold mt-1 mb-2'>Curate</h4>
            <p className='text-gray-600'>We scout drops across categories and shortlist only the most wearable winners.</p>
          </div>
          <div className='border rounded-md p-6 bg-white animate-soft-reveal' style={{animationDelay:'80ms'}}>
            <p className='text-gray-400 text-xs'>02</p>
            <h4 className='font-semibold mt-1 mb-2'>Validate</h4>
            <p className='text-gray-600'>Quality checks, trial fits and small test runs to remove surprises.</p>
          </div>
          <div className='border rounded-md p-6 bg-white animate-soft-reveal' style={{animationDelay:'160ms'}}>
            <p className='text-gray-400 text-xs'>03</p>
            <h4 className='font-semibold mt-1 mb-2'>Deliver</h4>
            <p className='text-gray-600'>Fast dispatch, friendly support and an experience that keeps you coming back.</p>
          </div>
        </div>
      </section>

      {/* spacer */}
      <div className='h-10' />
    </div>
  )
}

export default About
