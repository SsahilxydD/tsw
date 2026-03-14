import React, { useContext, useEffect, useState } from 'react'
import Title from './Title'
import { ShopContext } from '../context/ShopContext';
import ProductItem from './ProductItem';

const RelatedProducts = ({ category, subCategory }) => {

    const [related, setRelated] = useState([])

    const { products } = useContext(ShopContext)

    useEffect(() => {

        if (products && products.length > 0) {
            let productsCopy = products.slice()
            productsCopy = productsCopy.filter(item => category === item.category);
            productsCopy = productsCopy.filter(item => subCategory === item.subCategory);
            setRelated(productsCopy.slice(0, 5));
        }
    }, [products, category, subCategory])

    return (
        <div className='my-24'>
            <div className='text-center text-3xl py-2'>
                <Title text1={"RELATED"} text2={"PRODUCTS"} />
            </div>

            <div className='grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6'>
                {
                    related.map((item, index) => (
                        <ProductItem key={item._id} id={item._id} image={item.image} name={item.name} price={item.price} />
                    ))
                }
            </div>
        </div>
    )
}

export default RelatedProducts
