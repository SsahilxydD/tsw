import React, { useContext } from 'react'
import Title from './Title'
import { ShopContext } from '../context/ShopContext'

const CartTotal = () => {

    const { currency, getCartSubtotal, getDiscountAmount, getCartTotal, appliedCoupon } = useContext(ShopContext);
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount();
    const total = getCartTotal();

    return (
        <div className='w-full'>
            <div className='text-2xl'>
                <Title text1={'CART'} text2={'TOTALS'} />
            </div>
            <div className='flex flex-col gap-2 mt-2 text-sm'>
                <div className='flex justify-between'>
                    <p>Subtotal</p>
                    <p>{currency}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                {appliedCoupon && discount > 0 && (
                    <>
                        <div className='flex justify-between text-green-600'>
                            <p>Discount ({appliedCoupon.code})</p>
                            <p>-{currency}{discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </>
                )}
                <hr />
                <div className='flex justify-between'>
                    <b>Total</b>
                    <b>{currency}{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                </div>
            </div>
        </div>
    )
}

export default CartTotal
