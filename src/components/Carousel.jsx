import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import SafeImg from './SafeImg';
import './Carousel.css';

function CarouselSlide({ item, index, x, trackItemOffset, baseWidth, round, effectiveTransition, currency, onProductClick }) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      key={item._id || index}
      className={`carousel-item ${round ? 'round' : ''}`}
      style={{
        width: baseWidth,
        height: baseWidth,
        minWidth: baseWidth,
        rotateY: rotateY,
        ...(round && { borderRadius: '50%' })
      }}
      transition={effectiveTransition}
    >
      <Link
        to={item.url || '#'}
        className="carousel-item-link"
        onClick={() => onProductClick && onProductClick(item)}
      >
        <div className="carousel-item-image-container">
          <SafeImg
            src={item.image || '/assets/no-image.png'}
            alt={item.title || ''}
            className="carousel-item-image"
            width={baseWidth}
            height={baseWidth}
            quality={85}
          />
        </div>
        <div className="carousel-item-content">
          <div className="carousel-item-title">{item.title || ''}</div>
          <p className="carousel-item-description">{currency}{item.price || 0}</p>
        </div>
      </Link>
    </motion.div>
  );
}

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring', stiffness: 300, damping: 30 };
// Smooth autoplay transition - optimized for seamless carousel movement
const AUTOPLAY_TRANSITION = {
  type: 'spring',
  stiffness: 200,
  damping: 35,
  mass: 0.8,
  velocity: 0
};

export default function Carousel({
  items = [],
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
  currency = '₹',
  onProductClick
}) {
  const containerPadding = 0;
  const itemWidth = baseWidth;
  const trackItemOffset = itemWidth + GAP;
  const carouselItems = loop && items.length > 0 ? [...items, items[0]] : items;
  const [currentIndex, setCurrentIndex] = useState(0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const resetTimerRef = useRef(null);

  // Clear the loop-reset timer on unmount to avoid setState-after-unmount
  useEffect(() => () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); }, []);

  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  // Persistent, indestructible autoplay - never stops
  useEffect(() => {
    if (!autoplay || items.length === 0) return;

    // Always run autoplay regardless of hover state when pauseOnHover is false
    const shouldPause = pauseOnHover && isHovered;
    
    if (shouldPause) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev === items.length - 1 && loop) {
          return prev + 1;
        }
        if (prev === carouselItems.length - 1) {
          return loop ? 0 : prev;
        }
        return prev + 1;
      });
    }, autoplayDelay);

    // Ensure timer is always cleared on unmount or dependency change
    return () => {
      clearInterval(timer);
    };
  }, [autoplay, autoplayDelay, isHovered, loop, items.length, carouselItems.length, pauseOnHover]);

  // Use smooth autoplay transition when autoplay is active and not dragging, otherwise use spring
  const effectiveTransition = isResetting 
    ? { duration: 0 } 
    : (autoplay && !isDragging) 
      ? AUTOPLAY_TRANSITION 
      : SPRING_OPTIONS;

  const handleAnimationComplete = () => {
    if (loop && currentIndex === carouselItems.length - 1) {
      setIsResetting(true);
      x.set(0);
      setCurrentIndex(0);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setIsResetting(false), 50);
    }
  };

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      if (loop && currentIndex === items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(prev => Math.min(prev + 1, carouselItems.length - 1));
      }
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      if (loop && currentIndex === 0) {
        setCurrentIndex(items.length - 1);
      } else {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      }
    }
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -(trackItemOffset * (carouselItems.length - 1)),
          right: 0
        },
        dragElastic: 0.2
      };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`carousel-container ${round ? 'round' : ''}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        ...(round && { height: `${baseWidth}px`, borderRadius: '50%' })
      }}
    >
      <motion.div
        className="carousel-track"
        drag="x"
        {...dragProps}
        style={{
          width: '100%',
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${currentIndex * trackItemOffset + itemWidth / 2}px 50%`,
          x
        }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => {
          setIsDragging(false);
          handleDragEnd(e, info);
        }}
        animate={{ x: -(currentIndex * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationComplete={handleAnimationComplete}
      >
        {carouselItems.map((item, index) => (
          <CarouselSlide
            key={`${item._id || item.slug || 'item'}-${index}`}
            item={item}
            index={index}
            x={x}
            trackItemOffset={trackItemOffset}
            baseWidth={baseWidth}
            round={round}
            effectiveTransition={effectiveTransition}
            currency={currency}
            onProductClick={onProductClick}
          />
        ))}
      </motion.div>
    </div>
  );
}

