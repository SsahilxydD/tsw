import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import DomeGallery from './DomeGallery';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.png';

const ProductDomeGallery = () => {
  const { products, loadingProducts } = useContext(ShopContext);
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    if (loadingProducts) return;

    if (Array.isArray(products) && products.length > 0) {
      // Get a diverse set of product images
      // Try to get images from different categories
      const imageMap = new Map();
      
      products.forEach(product => {
        const image = product.image || (Array.isArray(product.images) ? product.images[0] : '') || NO_IMAGE_PLACEHOLDER;
        // Only add if we don't already have this image and it's not a placeholder
        if (image && image !== NO_IMAGE_PLACEHOLDER && !imageMap.has(image)) {
          imageMap.set(image, {
            src: image,
            alt: product.name || product.title || 'Product image'
          });
        }
      });

      // Convert to array and limit to reasonable number (the gallery will handle more)
      const images = Array.from(imageMap.values()).slice(0, 200);
      
      // If we don't have enough images, fill with placeholders or repeat
      if (images.length === 0) {
        setGalleryImages([{ src: NO_IMAGE_PLACEHOLDER, alt: 'No images available' }]);
      } else {
        setGalleryImages(images);
      }
    } else {
      setGalleryImages([]);
    }
  }, [products, loadingProducts]);

  if (loadingProducts || galleryImages.length === 0) {
    return null;
  }

  return (
    <section 
      className="relative" 
      style={{ 
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        overflow: 'hidden',
        padding: '40px 0',
        marginTop: '40px',
        marginBottom: '40px',
        background: 'transparent'
      }}
    >
      <div 
        className="w-full"
        style={{ 
          height: 'clamp(500px, 70vh, 800px)',
          minHeight: '500px',
          maxHeight: '800px',
          background: 'transparent'
        }}
      >
        <DomeGallery 
          images={galleryImages}
          fit={0.75}
          fitBasis="width"
          minRadius={500}
          maxRadius={1200}
          padFactor={0.1}
          overlayBlurColor="#060010"
          maxVerticalRotationDeg={5}
          dragSensitivity={20}
          enlargeTransitionMs={300}
          segments={35}
          dragDampening={2}
          openedImageWidth="300px"
          openedImageHeight="400px"
          imageBorderRadius="12px"
          openedImageBorderRadius="30px"
          grayscale={false}
        />
      </div>
    </section>
  );
};

export default ProductDomeGallery;

