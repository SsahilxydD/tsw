import React from 'react';
import { Link } from 'react-router-dom';

const AnnouncementBar = ({ isTransparent }) => {
    return (
        <div className={`fixed top-0 left-0 right-0 h-9 overflow-hidden z-50 transition-colors duration-300 ${isTransparent ? 'bg-black/30 backdrop-blur-sm' : 'bg-primary'} text-white`}>
            <Link
                to="/category/discounted"
                className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="View current promotions"
            >
                <div className="annc-wrap h-full flex items-center">
                    <div className="annc-track uppercase tracking-widest text-[10px] sm:text-xs font-medium">
                        <div className="annc-seq flex gap-8 items-center">
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>3 Days Return Policy</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>3 Days Return Policy</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                        </div>
                        <div className="annc-seq flex gap-8 items-center" aria-hidden="true">
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>3 Days Return Policy</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>New Collection Live Now</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>Honest Prices, Curated Drops</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span>3 Days Return Policy</span>
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
