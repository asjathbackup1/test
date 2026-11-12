const { generateCropRecommendations, detectSeason } = require('../services/recommendationEngine');

describe('recommendationEngine', () => {
  const cropRequirements = [
    {
      crop_id: 1,
      crop_name: 'Paddy',
      climate_zone: 'Dry',
      season: 'Maha',
      soil_types: 'Clay loam, alluvial, lowland paddy soil',
      min_temperature: 25,
      max_temperature: 32,
      min_seasonal_rainfall_mm: 900,
      max_seasonal_rainfall_mm: 1500,
      water_source: 'irrigated',
      notes: 'Suitable for dry-zone Maha conditions.',
    },
    {
      crop_id: 2,
      crop_name: 'Sesame',
      climate_zone: 'Dry',
      season: 'Yala',
      soil_types: 'Sandy loam, light textured soil',
      min_temperature: 25,
      max_temperature: 35,
      min_seasonal_rainfall_mm: 300,
      max_seasonal_rainfall_mm: 700,
      water_source: 'rainfed',
      notes: 'Short duration crop for dry periods.',
    },
    {
      crop_id: 3,
      crop_name: 'Tea',
      climate_zone: 'Wet',
      season: 'Both',
      soil_types: 'Well-drained loam, acidic loam',
      min_temperature: 16,
      max_temperature: 26,
      min_seasonal_rainfall_mm: 1800,
      max_seasonal_rainfall_mm: 3000,
      water_source: 'rainfed',
      notes: 'Wet-zone crop.',
    },
  ];

  test('Anuradhapura in Maha favors paddy and gives a strong score', () => {
    const result = generateCropRecommendations({
      district: 'Anuradhapura',
      soil_type: 'Clay loam',
      water_source: 'irrigated',
      weather: { temperature: 29, rainfall_24h: 12 },
      cropRequirements,
      date: new Date('2026-11-15'),
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].crop_name).toBe('Paddy');
    expect(result[0].score).toBeGreaterThanOrEqual(60);
    expect(result[0].label).toMatch(/Highly suitable|Moderately suitable/);
  });

  test('Anuradhapura in Yala is more likely to recommend dry-tolerant crops', () => {
    const result = generateCropRecommendations({
      district: 'Anuradhapura',
      soil_type: 'Sandy loam',
      water_source: 'rainfed',
      weather: { temperature: 31, rainfall_24h: 8 },
      cropRequirements,
      date: new Date('2026-06-15'),
    });

    expect(result[0].crop_name).toBe('Sesame');
  });

  test('Wet-zone districts receive wet-zone suitable crops such as tea', () => {
    const result = generateCropRecommendations({
      district: 'Kandy',
      soil_type: 'Well-drained loam',
      water_source: 'rainfed',
      weather: { temperature: 22, rainfall_24h: 40 },
      cropRequirements,
      date: new Date('2026-02-15'),
    });

    expect(result[0].crop_name).toBe('Tea');
  });

  test('Missing soil type still produces a fallback recommendation list', () => {
    const result = generateCropRecommendations({
      district: 'Anuradhapura',
      soil_type: '',
      water_source: 'rainfed',
      weather: { temperature: 28, rainfall_24h: 15 },
      cropRequirements,
      date: new Date('2026-11-15'),
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].score).toBeGreaterThanOrEqual(40);
  });

  test('Season detection returns Maha for October to March', () => {
    expect(detectSeason(new Date('2026-11-21'))).toBe('Maha');
    expect(detectSeason(new Date('2026-06-21'))).toBe('Yala');
  });
});