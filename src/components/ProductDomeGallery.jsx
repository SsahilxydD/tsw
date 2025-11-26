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
    <div 
      className="w-full"
      style={{ 
        height: 'clamp(400px, 50vw, 600px)',
        minHeight: '400px',
        maxHeight: '600px',
        marginTop: '40px', 
        marginBottom: '40px' 
      }}
    >
      <DomeGallery 
        images={galleryImages}
        fit={0.5}
        fitBasis="auto"
        minRadius={300}
        maxRadius={800}
        padFactor={0.15}
        overlayBlurColor="#060010"
        maxVerticalRotationDeg={5}
        dragSensitivity={20}
        enlargeTransitionMs={300}
        segments={35}
        dragDampening={2}
        openedImageWidth="250px"
        openedImageHeight="350px"
        imageBorderRadius="12px"
        openedImageBorderRadius="30px"
        grayscale={false}
      />
    </div>
  );
};

export default ProductDomeGallery;

