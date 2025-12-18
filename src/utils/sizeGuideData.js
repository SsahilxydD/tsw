// src/utils/sizeGuideData.js
/**
 * Size Guide Data
 * Contains size charts for different product categories
 */

// UK to EU shoe size conversion
const UK_TO_EU_SHOES = {
  5: 38,
  6: 39,
  7: 40,
  8: 41,
  9: 42,
  10: 43,
  11: 44,
  12: 45,
};

// UK to US shoe size conversion (men's)
const UK_TO_US_SHOES = {
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
  10: 11,
  11: 12,
  12: 13,
};

// Apparel size chart (S, M, L, XL, XXL)
const APPAREL_SIZES = {
  'S': {
    chest: '36-38',
    waist: '30-32',
    length: 'Regular',
    fit: 'Slim',
  },
  'M': {
    chest: '38-40',
    waist: '32-34',
    length: 'Regular',
    fit: 'Regular',
  },
  'L': {
    chest: '40-42',
    waist: '34-36',
    length: 'Regular',
    fit: 'Regular',
  },
  'XL': {
    chest: '42-44',
    waist: '36-38',
    length: 'Regular',
    fit: 'Regular',
  },
  'XXL': {
    chest: '44-46',
    waist: '38-40',
    length: 'Regular',
    fit: 'Regular',
  },
};

// Jeans size chart (waist sizes)
const JEANS_SIZES = {
  '26': { waist: '26"', inseam: '30"', fit: 'Slim' },
  '28': { waist: '28"', inseam: '30"', fit: 'Slim' },
  '30': { waist: '30"', inseam: '30"', fit: 'Regular' },
  '32': { waist: '32"', inseam: '32"', fit: 'Regular' },
  '34': { waist: '34"', inseam: '32"', fit: 'Regular' },
  '36': { waist: '36"', inseam: '32"', fit: 'Regular' },
  '38': { waist: '38"', inseam: '34"', fit: 'Relaxed' },
  '40': { waist: '40"', inseam: '34"', fit: 'Relaxed' },
  '42': { waist: '42"', inseam: '34"', fit: 'Relaxed' },
};

/**
 * Get size guide data for a product category
 */
export const getSizeGuideData = (categoryRaw, isFootwear = false, isJeans = false) => {
  // Footwear size guide
  if (isFootwear || categoryRaw === 'shoes' || categoryRaw === 'womenshoes' || categoryRaw === 'flipflops') {
    return {
      type: 'footwear',
      title: 'Shoe Size Guide',
      description: 'Find your perfect fit using the size chart below. Measure your foot length and match it to the corresponding UK size.',
      measurementInstructions: 'Measure your foot length from heel to toe while standing. Use the longest foot measurement.',
      columns: ['UK', 'EU', 'US', 'Foot Length (cm)'],
      rows: [5, 6, 7, 8, 9, 10, 11, 12].map(uk => ({
        uk: `UK ${uk}`,
        eu: UK_TO_EU_SHOES[uk] || '-',
        us: UK_TO_US_SHOES[uk] || '-',
        footLength: uk === 5 ? '24-24.5' : uk === 6 ? '25-25.5' : uk === 7 ? '26-26.5' : uk === 8 ? '27-27.5' : uk === 9 ? '28-28.5' : uk === 10 ? '29-29.5' : uk === 11 ? '30-30.5' : '31-31.5',
      })),
    };
  }

  // Jeans size guide
  if (isJeans || categoryRaw === 'jeans') {
    return {
      type: 'jeans',
      title: 'Jeans Size Guide',
      description: 'Select your size based on waist measurement. All sizes include standard inseam lengths.',
      measurementInstructions: 'Measure your waist at the narrowest point, typically just above the belly button. Keep the measuring tape snug but not tight.',
      columns: ['Size', 'Waist', 'Inseam', 'Fit'],
      rows: Object.keys(JEANS_SIZES).map(size => ({
        size,
        waist: JEANS_SIZES[size].waist,
        inseam: JEANS_SIZES[size].inseam,
        fit: JEANS_SIZES[size].fit,
      })),
    };
  }

  // Apparel size guide (default for shirts, t-shirts, hoodies, etc.)
  return {
    type: 'apparel',
    title: 'Apparel Size Guide',
    description: 'Choose your size based on chest and waist measurements. If you\'re between sizes, we recommend sizing up.',
    measurementInstructions: 'Chest: Measure around the fullest part of your chest, keeping the tape horizontal. Waist: Measure around your natural waistline.',
    columns: ['Size', 'Chest (inches)', 'Waist (inches)', 'Fit'],
    rows: Object.keys(APPAREL_SIZES).map(size => ({
      size,
      chest: APPAREL_SIZES[size].chest,
      waist: APPAREL_SIZES[size].waist,
      fit: APPAREL_SIZES[size].fit,
    })),
  };
};

/**
 * Get size recommendation based on measurements
 */
export const getSizeRecommendation = (categoryRaw, isFootwear, isJeans, measurements = {}) => {
  const guide = getSizeGuideData(categoryRaw, isFootwear, isJeans);

  if (guide.type === 'footwear' && measurements.footLength) {
    const footLength = parseFloat(measurements.footLength);
    if (footLength >= 24 && footLength < 25) return 'UK 5';
    if (footLength >= 25 && footLength < 26) return 'UK 6';
    if (footLength >= 26 && footLength < 27) return 'UK 7';
    if (footLength >= 27 && footLength < 28) return 'UK 8';
    if (footLength >= 28 && footLength < 29) return 'UK 9';
    if (footLength >= 29 && footLength < 30) return 'UK 10';
    if (footLength >= 30 && footLength < 31) return 'UK 11';
    if (footLength >= 31) return 'UK 12';
  }

  if (guide.type === 'jeans' && measurements.waist) {
    const waist = parseFloat(measurements.waist);
    // Find closest size
    const sizes = Object.keys(JEANS_SIZES).map(Number).sort((a, b) => a - b);
    const closest = sizes.reduce((prev, curr) => 
      Math.abs(curr - waist) < Math.abs(prev - waist) ? curr : prev
    );
    return String(closest);
  }

  if (guide.type === 'apparel' && measurements.chest) {
    const chest = parseFloat(measurements.chest);
    if (chest <= 38) return 'S';
    if (chest <= 40) return 'M';
    if (chest <= 42) return 'L';
    if (chest <= 44) return 'XL';
    return 'XXL';
  }

  return null;
};

