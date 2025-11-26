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
      // Group products by category to ensure diversity
      const categoryMap = new Map();
      
      products.forEach(product => {
        const category = product.categoryRaw || product.category || 'other';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        const image = product.image || (Array.isArray(product.images) ? product.images[0] : '') || NO_IMAGE_PLACEHOLDER;
        if (image && image !== NO_IMAGE_PLACEHOLDER) {
          categoryMap.get(category).push({
            src: image,
            alt: product.name || product.title || 'Product image',
            category: category
          });
        }
      });

      // Get a balanced selection from each category
      const imagesPerCategory = Math.ceil(200 / Math.max(categoryMap.size, 1));
      const selectedImages = [];
      const imageSet = new Set(); // Track unique images to avoid duplicates
      
      // Iterate through categories and take images from each
      for (const [category, categoryProducts] of categoryMap.entries()) {
        const categoryImages = categoryProducts
          .filter(img => !imageSet.has(img.src))
          .slice(0, imagesPerCategory);
        
        categoryImages.forEach(img => {
          imageSet.add(img.src);
          selectedImages.push(img);
        });
      }

      // If we still need more images, fill from remaining products
      if (selectedImages.length < 200) {
        products.forEach(product => {
          if (selectedImages.length >= 200) return;
          const image = product.image || (Array.isArray(product.images) ? product.images[0] : '') || NO_IMAGE_PLACEHOLDER;
          if (image && image !== NO_IMAGE_PLACEHOLDER && !imageSet.has(image)) {
            imageSet.add(image);
            selectedImages.push({
              src: image,
              alt: product.name || product.title || 'Product image'
            });
          }
        });
      }

      // Limit to 200 images
      const images = selectedImages.slice(0, 200);
      
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
        padding: '0',
        marginTop: '40px',
        marginBottom: '40px',
        background: 'transparent'
      }}
    >
      <div 
        className="w-full"
        style={{ 
          height: 'clamp(450px, 65vh, 750px)',
          minHeight: '450px',
          maxHeight: '750px',
          background: 'transparent'
        }}
      >
        <DomeGallery 
          images={galleryImages}
          fit={0.85}
          fitBasis="width"
          minRadius={500}
          maxRadius={1200}
          padFactor={0.02}
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

