const { generateCropRecommendations } = require('../services/recommendationEngine');

const scenarios = [
  {
    district: 'Anuradhapura',
    season: 'Maha',
    soil_type: 'Clay loam',
    water_source: 'irrigated',
    weather: { temperature: 29, rainfall_24h: 12 },
    expected: 'Paddy',
  },
  {
    district: 'Anuradhapura',
    season: 'Yala',
    soil_type: 'Sandy loam',
    water_source: 'rainfed',
    weather: { temperature: 31, rainfall_24h: 8 },
    expected: 'Sesame',
  },
  {
    district: 'Kandy',
    season: 'Maha',
    soil_type: 'Well-drained loam',
    water_source: 'rainfed',
    weather: { temperature: 22, rainfall_24h: 40 },
    expected: 'Tea',
  },
  {
    district: 'Colombo',
    season: 'Yala',
    soil_type: 'Loam',
    water_source: 'both',
    weather: { temperature: 27, rainfall_24h: 18 },
    expected: 'Tea',
  },
];

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
  },
];

const total = scenarios.length;
let matched = 0;

scenarios.forEach((scenario) => {
  const result = generateCropRecommendations({
    district: scenario.district,
    soil_type: scenario.soil_type,
    water_source: scenario.water_source,
    weather: scenario.weather,
    cropRequirements,
    date: new Date(scenario.season === 'Maha' ? '2026-11-15' : '2026-06-15'),
  });

  const topName = result[0]?.crop_name;
  if (topName === scenario.expected) {
    matched += 1;
  }

  console.log(
    `Scenario: ${scenario.district} ${scenario.season} -> ${topName || 'none'} (expected ${scenario.expected})`
  );
});

const agreement = ((matched / total) * 100).toFixed(1);
console.log(`Agreement: ${agreement}%`);
console.log('Note: expected values are decision-support targets to be confirmed by a Sri Lankan agriculture officer.');
