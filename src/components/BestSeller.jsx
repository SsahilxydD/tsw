// src/components/BestSeller.jsx
import React, { useContext, useMemo } from 'react'
import Title from './Title'
import { ShopContext } from '../context/ShopContext'
import ProductItem from './ProductItem'

const BestSeller = () => {
  const { products } = useContext(ShopContext)

  const bestSellers = useMemo(() => {
    if (!Array.isArray(products)) return []
    const flagged = products.filter(p => p.bestseller)
    return (flagged.length > 0 ? flagged : products).slice(0, 10)
  }, [products])

  return (
    <div className='my-10'>
      <div className='text-center py-8 text-3xl'>
        <Title text1={"BEST"} text2={"SELLERS"} />
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'></p>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
        {bestSellers.map((item, index) => (
          <ProductItem
            key={item._id || index}
            id={item._id}
            image={Array.isArray(item.image) ? item.image[0] : item.image}
            name={item.name}
            price={item.price}
            i={index}
          />
        ))}
      </div>
    </div>
  )
}

export default BestSeller
