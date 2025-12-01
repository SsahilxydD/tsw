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

                                    return (
                                        <div key={index} className="flex gap-4">
                                            <div className="w-20 h-24 flex-shrink-0 bg-gray-50 rounded overflow-hidden">
                                                <img
                                                    src={productData.image[0]}
                                                    alt={productData.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{productData.name}</h3>
                                                        <button
                                                            onClick={() => updateQuantity(item._id, item.size, 0)}
                                                            className="text-gray-400 hover:text-red-500 ml-2"
                                                        >
                                                            <img src={assets.bin_icon} className="w-4 h-4" alt="Remove" />
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
