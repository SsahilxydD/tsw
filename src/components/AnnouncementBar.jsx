import React from 'react';
import { Link } from 'react-router-dom';

const AnnouncementBar = () => {
    return (
        <div className="bg-primary text-white overflow-hidden relative z-50">
            <Link
                to="/category/discounted"
                className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Click here for huge discounts"
            >
                <div className="annc-wrap">
                    <div className="annc-track uppercase tracking-widest text-[10px] sm:text-xs py-2 font-medium">
                        <div className="annc-seq flex gap-8 items-center">
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Free Shipping on Orders Over ₹999</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Free Shipping on Orders Over ₹999</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                        </div>
                        <div className="annc-seq flex gap-8 items-center" aria-hidden="true">
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Free Shipping on Orders Over ₹999</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Free Shipping on Orders Over ₹999</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default AnnouncementBar;
