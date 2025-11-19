import React, { useContext, useState } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { ShopContext } from '../context/ShopContext'

const PlaceOrder = () => {

    const { navigate, address, setAddress, cartItems, products, currency, getCartAmount, setCartItems } = useContext(ShopContext);
    const [method, setMethod] = useState('cod');

    // Initialize form with context address or empty
    const [formData, setFormData] = useState({
        firstName: address?.firstName || '',
        lastName: address?.lastName || '',
        email: address?.email || '',
        street: address?.address1 || '',
        city: address?.locality || '',
        state: address?.state || '',
        zipcode: address?.zip || '',
        country: address?.country || 'India',
        phone: address?.phone || ''
    });

    const onChangeHandler = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setFormData(data => ({ ...data, [name]: value }));
        // Update global address context as user types (optional, but good for persistence)
        setAddress(prev => ({ ...prev, [name]: value }));
    }

    const onSubmitHandler = (event) => {
        event.preventDefault();

        // Construct WhatsApp Message
        let message = `*New Order Request*\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${formData.firstName} ${formData.lastName}\n`;
        message += `Phone: ${formData.phone}\n`;
        message += `Address: ${formData.street}, ${formData.city}, ${formData.state} - ${formData.zipcode}\n\n`;

        message += `*Order Items:*\n`;
        let hasItems = false;
        for (const items in cartItems) {
            for (const item in cartItems[items]) {
                if (cartItems[items][item] > 0) {
                    const itemInfo = products.find((product) => product._id === items);
                    if (itemInfo) {
                        message += `- ${itemInfo.name} (Size: ${item}) x ${cartItems[items][item]}\n`;
                        hasItems = true;
                    }
                }
            }
        }

        if (!hasItems) {
            alert("Your cart is empty!");
            return;
        }

        message += `\n*Total Amount:* ${currency}${getCartAmount()}`;
        message += `\n\nPayment Method: ${method === 'cod' ? 'Cash on Delivery' : 'Online'}`;

        // Open WhatsApp
        const phoneNumber = "919933778870"; // Using the number found in Navbar/Payment
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        // Clear cart (optional, but logical after order)
        // setCartItems({}); 
        navigate('/');
    }

    return (
        <form onSubmit={onSubmitHandler} className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t'>
            <div className='flex flex-col gap-4 w-full sm:max-w-[480px]'>

                <div className='text-xl sm:text-2xl my-3'>
                    <Title text1={'DELIVERY'} text2={'INFORMATION'} />
                </div>
                <div className='flex gap-3'>
                    <input required name='firstName' onChange={onChangeHandler} value={formData.firstName} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='First name' />
                    <input required name='lastName' onChange={onChangeHandler} value={formData.lastName} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Last name' />
                </div>
                <input required name='email' onChange={onChangeHandler} value={formData.email} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="email" placeholder='Email address' />
                <input required name='street' onChange={onChangeHandler} value={formData.street} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Street' />
                <div className='flex gap-3'>
                    <input required name='city' onChange={onChangeHandler} value={formData.city} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='City' />
                    <input required name='state' onChange={onChangeHandler} value={formData.state} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='State' />
                </div>
                <div className='flex gap-3'>
                    <input required name='zipcode' onChange={onChangeHandler} value={formData.zipcode} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="number" placeholder='Zipcode' />
                    <input required name='country' onChange={onChangeHandler} value={formData.country} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Country' />
                </div>
                <input required name='phone' onChange={onChangeHandler} value={formData.phone} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="number" placeholder='Phone' />
            </div>

            <div className='mt-8'>

                <div className='mt-8 min-w-80'>
                    <CartTotal />
                </div>

                <div className='mt-12'>
                    <Title text1={'PAYMENT'} text2={'METHOD'} />
                    <div className='flex gap-3 flex-col lg:flex-row'>
                        <div onClick={() => setMethod('cod')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
                            <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'cod' ? 'bg-green-400' : ''}`}></p>
                            <p className=' text-gray-500 text-sm font-medium mx-4'>CASH ON DELIVERY</p>
                        </div>
                    </div>

                    <div className='w-full text-end mt-8'>
                        <button type='submit' className='bg-black text-white px-16 py-3 text-sm'>PLACE ORDER</button>
                    </div>
                </div>
            </div>
        </form>
    )
}

export default PlaceOrder
