import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import { assets } from '../assets/assets';
import { motion, AnimatePresence } from 'framer-motion';

const CartDrawer = () => {
    const {
        isCartOpen,
        setIsCartOpen,
        cartItems,
        products,
        currency,
        updateQuantity,
        getCartAmount,
        navigate
    } = useContext(ShopContext);

    const [cartData, setCartData] = React.useState([]);

    React.useEffect(() => {
        if (products.length > 0) {
            const tempData = [];
            for (const items in cartItems) {
                for (const item in cartItems[items]) {
                    if (cartItems[items][item] > 0) {
                        tempData.push({
                            _id: items,
                            size: item,
                            quantity: cartItems[items][item]
                        });
                    }
                }
            }
            setCartData(tempData);
        }
    }, [cartItems, products]);

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-[9999] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b">
                            <h2 className="text-xl font-medium prata-regular">Shopping Cart ({cartData.length})</h2>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <img src={assets.cross_icon} className="w-5 h-5" alt="Close" />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {cartData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                    <p className="text-gray-500">Your cart is empty</p>
                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            navigate('/collection');
                                        }}
                                        className="px-6 py-2 bg-black text-white text-sm uppercase tracking-wide hover:bg-gray-800 transition-colors"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                cartData.map((item, index) => {
                                    const productData = products.find((product) => product._id === item._id);
                                    if (!productData) return null;

                                    // Handle different image formats
                                    const cover = Array.isArray(productData.images) 
                                        ? productData.images[0] 
                                        : (Array.isArray(productData.image) 
                                            ? productData.image[0] 
                                            : productData.image) || '/assets/no-image.svg';

                                    return (
                                        <div key={index} className="flex gap-4">
                                            <Link 
                                                to={`/product/${item._id}`}
                                                onClick={() => setIsCartOpen(false)}
                                                className="w-20 h-24 flex-shrink-0 bg-gray-50 rounded overflow-hidden hover:opacity-80 transition-opacity"
                                            >
                                                <img
                                                    src={cover}
                                                    alt={productData.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = '/assets/no-image.svg'; }}
                                                />
                                            </Link>
                                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex items-start gap-2">
                                                        <Link 
                                                            to={`/product/${item._id}`}
                                                            onClick={() => setIsCartOpen(false)}
                                                            className="flex-1 text-sm font-medium text-gray-900 line-clamp-2 hover:text-gray-600 transition-colors"
                                                        >
                                                            {productData.name}
                                                        </Link>
                                                        <button
                                                            onClick={() => updateQuantity(item._id, item.size, 0)}
                                                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            aria-label="Remove item"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                        <span className="px-2 py-0.5 border rounded bg-gray-50">{item.size}</span>
                                                        <span>{currency}{productData.price}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center border rounded">
                                                        <button
                                                            onClick={() => updateQuantity(item._id, item.size, item.quantity - 1)}
                                                            className="px-2 py-1 hover:bg-gray-50 text-gray-600"
                                                            disabled={item.quantity === 1}
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-2 text-sm font-medium w-8 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item._id, item.size, item.quantity + 1)}
                                                            className="px-2 py-1 hover:bg-gray-50 text-gray-600"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <p className="font-medium text-sm">
                                                        {currency}{productData.price * item.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        {cartData.length > 0 && (
                            <div className="border-t p-5 bg-gray-50 space-y-4">
                                {/* Trust Badges */}
                                <div className="border border-gray-300 rounded-lg p-3 bg-white">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span className="font-semibold text-gray-800">3 Days Return & Exchange</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                            </svg>
                                            <span className="font-semibold text-gray-800">Free Shipping</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span className="font-semibold text-gray-800">Secured Payment</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span className="font-semibold text-gray-800">Same Day Dispatch</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span>{currency}{getCartAmount()}</span>
                                    </div>
                                    <div className="flex justify-between font-medium text-lg">
                                        <span>Total</span>
                                        <span>{currency}{getCartAmount()}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 text-center">Shipping & taxes calculated at checkout</p>
                                </div>

                                <div className="grid gap-3">
                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            navigate('/address');
                                        }}
                                        className="w-full py-3 bg-black text-white text-sm font-medium uppercase tracking-wider hover:bg-gray-800 transition-colors"
                                    >
                                        Checkout
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            navigate('/cart');
                                        }}
                                        className="w-full py-3 border border-black text-black text-sm font-medium uppercase tracking-wider hover:bg-gray-50 transition-colors"
                                    >
                                        View Cart
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
