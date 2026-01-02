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
  const cat = String(categoryRaw || '').toLowerCase();

  // Women's shoes: many catalogs use EU sizing primarily.
  // Provide an EU-first guide so recommendations match the sizes shown on product pages.
  if (cat === 'womenshoes') {
    const EU_SIZES = [36, 37, 38, 39, 40, 41, 42];
    // Approximate EU -> UK (women/unisex-ish). This matches our UK_TO_EU table inversely for common sizes.
    const euToUkApprox = (eu) => {
      if (eu <= 36) return 'UK 3';
      if (eu === 37) return 'UK 4';
      if (eu === 38) return 'UK 5';
      if (eu === 39) return 'UK 6';
      if (eu === 40) return 'UK 7';
      if (eu === 41) return 'UK 8';
      return 'UK 9';
    };

    return {
      type: 'footwear',
      title: 'Women’s Shoe Size Guide',
      description: 'Find your fit using the EU size chart below. Measure your foot length and match it to the corresponding EU size.',
      measurementInstructions: 'Measure your foot length from heel to toe while standing. Use the longest foot measurement.',
      columns: ['EU', 'UK', 'Foot Length (cm)'],
      rows: EU_SIZES.map((eu) => ({
        eu: `EU ${eu}`,
        uk: euToUkApprox(eu),
        footLength: eu === 36 ? '22.5-23.0'
          : eu === 37 ? '23.1-23.7'
          : eu === 38 ? '23.8-24.4'
          : eu === 39 ? '24.5-25.0'
          : eu === 40 ? '25.1-25.7'
          : eu === 41 ? '25.8-26.4'
          : '26.5-27.0',
      })),
    };
  }

  // Footwear size guide
  if (isFootwear || cat === 'shoes' || cat === 'flipflops') {
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
  if (isJeans || cat === 'jeans') {
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
  const cat = String(categoryRaw || '').toLowerCase();

  if (guide.type === 'footwear' && measurements.footLength) {
    const footLength = parseFloat(measurements.footLength);
    if (!Number.isFinite(footLength)) return null;

    // Womenshoes: recommend EU sizes (matches product sizes in many catalogs)
    if (cat === 'womenshoes') {
      if (footLength < 23.1) return 'EU 36';
      if (footLength < 23.8) return 'EU 37';
      if (footLength < 24.5) return 'EU 38';
      if (footLength < 25.1) return 'EU 39';
      if (footLength < 25.8) return 'EU 40';
      if (footLength < 26.5) return 'EU 41';
      return 'EU 42';
    }

    // UK sizing (use half-size-ish boundaries around the ranges shown in the table)
    if (footLength < 25) return 'UK 5';
    if (footLength < 26) return 'UK 6';
    if (footLength < 27) return 'UK 7';
    if (footLength < 28) return 'UK 8';
    if (footLength < 29) return 'UK 9';
    if (footLength < 30) return 'UK 10';
    if (footLength < 31) return 'UK 11';
    return 'UK 12';
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

  if (guide.type === 'apparel' && (measurements.chest || measurements.waist)) {
    const chest = parseFloat(measurements.chest);
    const waist = parseFloat(measurements.waist);

    // If only one is provided, fall back to that.
    const byChest =
      Number.isFinite(chest)
        ? (chest <= 38 ? 'S' : chest <= 40 ? 'M' : chest <= 42 ? 'L' : chest <= 44 ? 'XL' : 'XXL')
        : null;
    const byWaist =
      Number.isFinite(waist)
        ? (waist <= 32 ? 'S' : waist <= 34 ? 'M' : waist <= 36 ? 'L' : waist <= 38 ? 'XL' : 'XXL')
        : null;

    if (!byChest && !byWaist) return null;

    // Choose the larger of the two recommendations (safer fit if measurements differ)
    const order = ['S', 'M', 'L', 'XL', 'XXL'];
    const i1 = byChest ? order.indexOf(byChest) : -1;
    const i2 = byWaist ? order.indexOf(byWaist) : -1;
    return order[Math.max(i1, i2)];
  }

  return null;
};

