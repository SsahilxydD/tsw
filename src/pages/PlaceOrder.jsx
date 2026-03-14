import React, { useContext, useState, useRef, useEffect } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { ShopContext } from '../context/ShopContext'
import Button from '../components/Button'
import Input from '../components/Input'
import { validateName, validateNameRequired, validatePhone, validateEmail, validateAddress, validateCity, validateState, validateZip } from '../utils/validation'

const PlaceOrder = () => {
    const { navigate, address, setAddress, cartItems, products, currency, getCartTotal, getCartSubtotal, getDiscountAmount, appliedCoupon, getCartCount, notify } = useContext(ShopContext);
    const [method, setMethod] = useState('cod');
    const [errors, setErrors] = useState({});
    const refs = useRef({});

    useEffect(() => {
        if (getCartCount() === 0) navigate('/cart');
    }, []);

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
        // Update global address context as user types
        setAddress(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    }

    const validate = () => {
        const errs = {};
        
        // Name validation
        const nameError = validateNameRequired(formData.firstName, formData.lastName);
        if (nameError) {
            errs.firstName = nameError;
        } else {
            if (formData.firstName?.trim()) {
                const firstNameError = validateName(formData.firstName, 'First name');
                if (firstNameError) errs.firstName = firstNameError;
            }
            if (formData.lastName?.trim()) {
                const lastNameError = validateName(formData.lastName, 'Last name');
                if (lastNameError) errs.lastName = lastNameError;
            }
        }
        
        // Email validation
        if (formData.email?.trim()) {
            const emailError = validateEmail(formData.email);
            if (emailError) errs.email = emailError;
        }
        
        // Phone validation
        const phoneError = validatePhone(formData.phone);
        if (phoneError) errs.phone = phoneError;
        
        // Address validation
        const addressError = validateAddress(formData.street, 'Street address');
        if (addressError) errs.street = addressError;
        
        // City validation
        const cityError = validateCity(formData.city, 'City');
        if (cityError) errs.city = cityError;
        
        // State validation
        const stateError = validateState(formData.state);
        if (stateError) errs.state = stateError;
        
        // ZIP validation
        const zipError = validateZip(formData.zipcode);
        if (zipError) errs.zipcode = zipError;
        
        return errs;
    };

    const onSubmitHandler = (event) => {
        event.preventDefault();
        
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            // Focus first error field
            const firstKey = Object.keys(errs)[0];
            refs.current[firstKey]?.focus();
            refs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Construct WhatsApp Message
        let message = `*New Order Request*\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${formData.firstName} ${formData.lastName}\n`;
        message += `Phone: ${formData.phone}\n`;
        if (formData.email) message += `Email: ${formData.email}\n`;
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
            notify("Your cart is empty!");
            return;
        }

        const subtotal = getCartSubtotal();
        const discount = getDiscountAmount();
        const total = getCartTotal();
        
        message += `\n*Subtotal:* ${currency}${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (appliedCoupon && discount > 0) {
            message += `\n*Discount (${appliedCoupon.code}):* -${currency}${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        message += `\n*Total Amount:* ${currency}${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        message += `\n\nPayment Method: ${method === 'cod' ? 'Cash on Delivery' : 'Online'}`;

        // Open WhatsApp
        const phoneNumber = import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || "919933778870";
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        navigate('/');
    }

    return (
        <form onSubmit={onSubmitHandler} className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t'>
            <div className='flex flex-col gap-4 w-full sm:max-w-[480px]'>

                <div className='text-xl sm:text-2xl my-3'>
                    <Title text1={'DELIVERY'} text2={'INFORMATION'} />
                </div>
                <div className='flex gap-3'>
                    <Input 
                        ref={el => refs.current.firstName = el}
                        name='firstName' 
                        onChange={onChangeHandler} 
                        value={formData.firstName} 
                        type="text" 
                        placeholder='First name *'
                        error={!!errors.firstName}
                        errorMessage={errors.firstName}
                        required 
                    />
                    <Input 
                        name='lastName' 
                        onChange={onChangeHandler} 
                        value={formData.lastName} 
                        type="text" 
                        placeholder='Last name'
                        error={!!errors.lastName}
                        errorMessage={errors.lastName}
                    />
                </div>
                <Input 
                    name='email' 
                    onChange={onChangeHandler} 
                    value={formData.email} 
                    type="email" 
                    placeholder='Email address (optional)'
                    error={!!errors.email}
                    errorMessage={errors.email}
                />
                <Input 
                    ref={el => refs.current.phone = el}
                    name='phone' 
                    onChange={onChangeHandler} 
                    value={formData.phone} 
                    type="tel"
                    inputMode="tel"
                    placeholder='Phone number *'
                    error={!!errors.phone}
                    errorMessage={errors.phone}
                    required 
                />
                <Input 
                    ref={el => refs.current.street = el}
                    name='street' 
                    onChange={onChangeHandler} 
                    value={formData.street} 
                    type="text" 
                    placeholder='Street address *'
                    error={!!errors.street}
                    errorMessage={errors.street}
                    required 
                />
                <div className='flex gap-3'>
                    <Input 
                        ref={el => refs.current.city = el}
                        name='city' 
                        onChange={onChangeHandler} 
                        value={formData.city} 
                        type="text" 
                        placeholder='City *'
                        error={!!errors.city}
                        errorMessage={errors.city}
                        required 
                    />
                    <Input 
                        ref={el => refs.current.state = el}
                        name='state' 
                        onChange={onChangeHandler} 
                        value={formData.state} 
                        type="text" 
                        placeholder='State *'
                        error={!!errors.state}
                        errorMessage={errors.state}
                        required 
                    />
                </div>
                <div className='flex gap-3'>
                    <Input 
                        ref={el => refs.current.zipcode = el}
                        name='zipcode' 
                        onChange={onChangeHandler} 
                        value={formData.zipcode} 
                        type="text"
                        inputMode="numeric"
                        placeholder='PIN code *'
                        maxLength={6}
                        error={!!errors.zipcode}
                        errorMessage={errors.zipcode}
                        required 
                    />
                    <Input 
                        name='country' 
                        onChange={onChangeHandler} 
                        value={formData.country} 
                        type="text" 
                        placeholder='Country'
                    />
                </div>
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
                        <Button type='submit' className='px-16'>PLACE ORDER</Button>
                    </div>
                </div>
            </div>
        </form>
    )
}

export default PlaceOrder
