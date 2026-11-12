const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const districts = [
  ['Ampara', 7.3025, 81.6747, 'Low country dry zone', 'Dry'],
  ['Anuradhapura', 8.3114, 80.4037, 'Dry zone', 'Dry'],
  ['Badulla', 6.9898, 81.0550, 'Upland wet zone', 'Intermediate'],
  ['Batticaloa', 7.7102, 81.6924, 'Coastal dry zone', 'Dry'],
  ['Colombo', 6.9271, 79.8612, 'Low country wet zone', 'Wet'],
  ['Galle', 6.0535, 80.2210, 'Low country wet zone', 'Wet'],
  ['Gampaha', 7.0840, 79.9994, 'Low country wet zone', 'Wet'],
  ['Hambantota', 6.1248, 81.1185, 'Low country dry zone', 'Dry'],
  ['Jaffna', 9.6615, 80.0255, 'North dry zone', 'Dry'],
  ['Kalutara', 6.5854, 79.9607, 'Low country wet zone', 'Wet'],
  ['Kandy', 7.2906, 80.6337, 'Mid country wet zone', 'Intermediate'],
  ['Kegalle', 7.2513, 80.3464, 'Mid country wet zone', 'Intermediate'],
  ['Kilinochchi', 9.3961, 80.3982, 'North dry zone', 'Dry'],
  ['Kurunegala', 7.4863, 80.3647, 'Intermediate zone', 'Intermediate'],
  ['Mannar', 8.9768, 79.9045, 'North dry zone', 'Dry'],
  ['Matale', 7.4675, 80.6234, 'Mid country intermediate zone', 'Intermediate'],
  ['Matara', 5.9549, 80.5353, 'Low country wet zone', 'Wet'],
  ['Monaragala', 6.8721, 81.3492, 'Uva dry zone', 'Dry'],
  ['Mullaitivu', 9.2671, 80.8144, 'North dry zone', 'Dry'],
  ['Nuwara Eliya', 6.9497, 80.7891, 'Up country wet zone', 'Wet'],
  ['Polonnaruwa', 7.9339, 81.0028, 'Dry zone', 'Dry'],
  ['Puttalam', 8.0362, 79.8283, 'North western dry zone', 'Dry'],
  ['Ratnapura', 6.6828, 80.3992, 'Wet zone', 'Wet'],
  ['Trincomalee', 8.5874, 81.2152, 'Eastern dry zone', 'Dry'],
  ['Vavuniya', 8.7514, 80.4971, 'North dry zone', 'Dry'],
];

const cropSeed = [
  'Paddy', 'Maize', 'Green gram', 'Cowpea', 'Chilli', 'Onion', 'Tomato', 'Brinjal',
  'Groundnut', 'Sesame', 'Banana', 'Sweet potato', 'Cassava', 'Turmeric', 'Ginger',
  'Coconut', 'Tea', 'Rubber', 'Black gram', 'Soybean'
];

const cropRequirements = [
  { crop: 'Paddy', climate_zone: 'Dry', season: 'Maha', soil_types: 'Clay loam, alluvial, lowland paddy soil', min_temperature: 25, max_temperature: 32, min_seasonal_rainfall_mm: 900, max_seasonal_rainfall_mm: 1500, water_source: 'irrigated', duration_days: 120, notes: 'Requires consistent soil moisture; prioritize irrigated systems in dry zones.', source: 'Department of Agriculture Sri Lanka and Rice Research and Development Institute (to be verified)', verified: false },
  { crop: 'Paddy', climate_zone: 'Dry', season: 'Yala', soil_types: 'Clay loam, alluvial, lowland paddy soil', min_temperature: 26, max_temperature: 34, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1200, water_source: 'irrigated', duration_days: 120, notes: 'Yala planting is viable only with irrigation support in dry areas.', source: 'Department of Agriculture Sri Lanka and Rice Research and Development Institute (to be verified)', verified: false },
  { crop: 'Paddy', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, clay loam, alluvial soil', min_temperature: 24, max_temperature: 32, min_seasonal_rainfall_mm: 700, max_seasonal_rainfall_mm: 1400, water_source: 'both', duration_days: 120, notes: 'Good adaptation under intermediate rainfall conditions when water is available.', source: 'Department of Agriculture Sri Lanka and Rice Research and Development Institute (to be verified)', verified: false },
  { crop: 'Paddy', climate_zone: 'Wet', season: 'Both', soil_types: 'Clay loam, alluvial, paddy soil', min_temperature: 23, max_temperature: 31, min_seasonal_rainfall_mm: 1000, max_seasonal_rainfall_mm: 1800, water_source: 'rainfed', duration_days: 120, notes: 'Wet zones can support rainfed paddy when conditions are favorable.', source: 'Department of Agriculture Sri Lanka and Rice Research and Development Institute (to be verified)', verified: false },

  { crop: 'Maize', climate_zone: 'Dry', season: 'Maha', soil_types: 'Sandy loam, red yellow podzolic', min_temperature: 24, max_temperature: 32, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'rainfed', duration_days: 110, notes: 'Can perform well in Maha when rainfall is adequate and soil is deep.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Maize', climate_zone: 'Intermediate', season: 'Yala', soil_types: 'Loam, sandy loam', min_temperature: 24, max_temperature: 30, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 1100, water_source: 'rainfed', duration_days: 110, notes: 'More dependable in intermediate zones with well-distributed rainfall.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Maize', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, sandy loam, well-drained soil', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1200, water_source: 'both', duration_days: 110, notes: 'Useful in well-drained wet-zone soils with careful water management.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Green gram', climate_zone: 'Dry', season: 'Maha', soil_types: 'Sandy loam, red soils', min_temperature: 25, max_temperature: 35, min_seasonal_rainfall_mm: 300, max_seasonal_rainfall_mm: 700, water_source: 'rainfed', duration_days: 60, notes: 'Good for low-rainfall dry-zone cropping with short duration.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Green gram', climate_zone: 'Intermediate', season: 'Yala', soil_types: 'Loam, sandy loam', min_temperature: 26, max_temperature: 32, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 800, water_source: 'both', duration_days: 60, notes: 'Can be grown in both seasons if rainfall distribution is even.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Green gram', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, well-drained soil', min_temperature: 24, max_temperature: 30, min_seasonal_rainfall_mm: 450, max_seasonal_rainfall_mm: 900, water_source: 'rainfed', duration_days: 60, notes: 'Risk increases under heavy persistent rains or poorly drained fields.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Cowpea', climate_zone: 'Dry', season: 'Yala', soil_types: 'Sandy loam, red yellow podzolic', min_temperature: 25, max_temperature: 34, min_seasonal_rainfall_mm: 300, max_seasonal_rainfall_mm: 700, water_source: 'rainfed', duration_days: 70, notes: 'Suitable for dry seasons when short-duration varieties are used.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Cowpea', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 24, max_temperature: 32, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 800, water_source: 'both', duration_days: 70, notes: 'Adapted well to intermediate and low-mid rainfall conditions.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Cowpea', climate_zone: 'Wet', season: 'Both', soil_types: 'Well-drained light loam', min_temperature: 23, max_temperature: 30, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 1000, water_source: 'both', duration_days: 70, notes: 'Can be productive if drainage is adequate and rainfall is not excessive.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Chilli', climate_zone: 'Dry', season: 'Maha', soil_types: 'Sandy loam, reddish brown earth', min_temperature: 24, max_temperature: 34, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'irrigated', duration_days: 120, notes: 'Needs irrigation in dry zones for consistent fruit set.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Chilli', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1000, water_source: 'both', duration_days: 120, notes: 'Performs best with moderate rainfall and drainage.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Chilli', climate_zone: 'Wet', season: 'Yala', soil_types: 'Loam, well-drained soil', min_temperature: 22, max_temperature: 29, min_seasonal_rainfall_mm: 700, max_seasonal_rainfall_mm: 1200, water_source: 'irrigated', duration_days: 120, notes: 'Wet-zone production can be good when disease pressure is managed.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Onion', climate_zone: 'Dry', season: 'Maha', soil_types: 'Sandy loam, red loam', min_temperature: 18, max_temperature: 30, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'irrigated', duration_days: 100, notes: 'Dry-zone onion depends on irrigation and careful soil water management.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Onion', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 18, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1000, water_source: 'both', duration_days: 100, notes: 'Suitable where rainfall is moderate and soils are well drained.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Onion', climate_zone: 'Wet', season: 'Yala', soil_types: 'Sandy loam, elevated beds', min_temperature: 18, max_temperature: 28, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1100, water_source: 'irrigated', duration_days: 100, notes: 'Uses well-drained raised beds in wetter domains.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Tomato', climate_zone: 'Dry', season: 'Maha', soil_types: 'Loam, sandy loam', min_temperature: 20, max_temperature: 32, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'irrigated', duration_days: 100, notes: 'Needs dependable irrigation and moderate humidity to avoid stress.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Tomato', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, well-drained soil', min_temperature: 20, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1100, water_source: 'both', duration_days: 100, notes: 'Suitable with balanced moisture and good drainage.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Tomato', climate_zone: 'Wet', season: 'Yala', soil_types: 'Loam, well-drained raised beds', min_temperature: 20, max_temperature: 29, min_seasonal_rainfall_mm: 700, max_seasonal_rainfall_mm: 1200, water_source: 'irrigated', duration_days: 100, notes: 'Weather can support good yield, but foliage disease risk should be monitored.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Brinjal', climate_zone: 'Dry', season: 'Maha', soil_types: 'Loam, red soils', min_temperature: 22, max_temperature: 35, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 800, water_source: 'irrigated', duration_days: 110, notes: 'Can perform well in dry-zone areas with irrigation management.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Brinjal', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 22, max_temperature: 32, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'both', duration_days: 110, notes: 'Suitable in warm intermediate zones across both seasons.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Brinjal', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, rich soil', min_temperature: 21, max_temperature: 29, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1100, water_source: 'rainfed', duration_days: 110, notes: 'Good performance when soils are fertile and drainage is adequate.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Groundnut', climate_zone: 'Dry', season: 'Maha', soil_types: 'Sandy loam, red yellow podzolic', min_temperature: 24, max_temperature: 34, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 800, water_source: 'rainfed', duration_days: 100, notes: 'Common dry-zone crop if rainfall is well distributed during the growing phase.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Groundnut', climate_zone: 'Intermediate', season: 'Yala', soil_types: 'Loam, sandy loam', min_temperature: 24, max_temperature: 31, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'both', duration_days: 100, notes: 'Suitability improves where soil drainage is strong and rainfall is moderate.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Groundnut', climate_zone: 'Wet', season: 'Both', soil_types: 'Well-drained loam', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1100, water_source: 'both', duration_days: 100, notes: 'Suitable if soils are well drained and not waterlogged.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Sesame', climate_zone: 'Dry', season: 'Yala', soil_types: 'Sandy loam, light textured soil', min_temperature: 25, max_temperature: 35, min_seasonal_rainfall_mm: 300, max_seasonal_rainfall_mm: 700, water_source: 'rainfed', duration_days: 90, notes: 'A suitable short-duration crop for dry zones with limited rainfall.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Sesame', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 24, max_temperature: 32, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 800, water_source: 'both', duration_days: 90, notes: 'Can be used as a low-water option in intermediate zones.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Sesame', climate_zone: 'Wet', season: 'Both', soil_types: 'Light loam, well-drained soil', min_temperature: 24, max_temperature: 30, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'rainfed', duration_days: 90, notes: 'Not ideal under constant high moisture; waterlogging raises risk.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Banana', climate_zone: 'Dry', season: 'Maha', soil_types: 'Deep loam, rich soil', min_temperature: 23, max_temperature: 32, min_seasonal_rainfall_mm: 800, max_seasonal_rainfall_mm: 1500, water_source: 'irrigated', duration_days: 300, notes: 'Dry-zone banana production depends heavily on irrigation and soil moisture retention.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Banana', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, fertile soil', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 700, max_seasonal_rainfall_mm: 1200, water_source: 'both', duration_days: 300, notes: 'Well suited to moderate rainfall and fertile soils.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Banana', climate_zone: 'Wet', season: 'Both', soil_types: 'Deep loam, fertile soil', min_temperature: 21, max_temperature: 29, min_seasonal_rainfall_mm: 900, max_seasonal_rainfall_mm: 1500, water_source: 'both', duration_days: 300, notes: 'Can be productive in wetter zones with good drainage.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Sweet potato', climate_zone: 'Dry', season: 'Yala', soil_types: 'Sandy loam, well-drained soil', min_temperature: 22, max_temperature: 34, min_seasonal_rainfall_mm: 300, max_seasonal_rainfall_mm: 700, water_source: 'rainfed', duration_days: 120, notes: 'Short-duration and suitable for dry areas with intermittent rainfall.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Sweet potato', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Sandy loam, loam', min_temperature: 22, max_temperature: 32, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 900, water_source: 'both', duration_days: 120, notes: 'Broad suitability with careful water and soil management.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Sweet potato', climate_zone: 'Wet', season: 'Both', soil_types: 'Sandy loam, well-drained soil', min_temperature: 22, max_temperature: 29, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 1000, water_source: 'rainfed', duration_days: 120, notes: 'Prefer well-drained conditions; excess water can reduce quality.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Cassava', climate_zone: 'Dry', season: 'Both', soil_types: 'Sandy loam, poor to moderate fertility soil', min_temperature: 25, max_temperature: 35, min_seasonal_rainfall_mm: 250, max_seasonal_rainfall_mm: 700, water_source: 'rainfed', duration_days: 240, notes: 'Drought-tolerant and suitable for dry zones with low rainfall.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Cassava', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Sandy loam, loam', min_temperature: 24, max_temperature: 32, min_seasonal_rainfall_mm: 350, max_seasonal_rainfall_mm: 800, water_source: 'rainfed', duration_days: 240, notes: 'Flexible and often productive with low-input management.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Cassava', climate_zone: 'Wet', season: 'Both', soil_types: 'Sandy loam, well-drained soil', min_temperature: 23, max_temperature: 30, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 900, water_source: 'rainfed', duration_days: 240, notes: 'Suitable if soils are not permanently waterlogged.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Turmeric', climate_zone: 'Dry', season: 'Maha', soil_types: 'Loam, rich soil', min_temperature: 20, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1000, water_source: 'irrigated', duration_days: 210, notes: 'Could fit irrigated dry-zone production but needs strong soil moisture.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Turmeric', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, fertile soil', min_temperature: 20, max_temperature: 29, min_seasonal_rainfall_mm: 700, max_seasonal_rainfall_mm: 1200, water_source: 'both', duration_days: 210, notes: 'Well suited to intermediate zones with good organic matter.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Turmeric', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, fertile soil', min_temperature: 20, max_temperature: 28, min_seasonal_rainfall_mm: 800, max_seasonal_rainfall_mm: 1300, water_source: 'rainfed', duration_days: 210, notes: 'Good performance when rainfall is well distributed and drainage is adequate.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Ginger', climate_zone: 'Dry', season: 'Maha', soil_types: 'Loam, rich soil', min_temperature: 20, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1000, water_source: 'irrigated', duration_days: 210, notes: 'Irrigation is usually necessary for a reliable crop in dry zones.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Ginger', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, organic-rich soil', min_temperature: 20, max_temperature: 29, min_seasonal_rainfall_mm: 700, max_seasonal_rainfall_mm: 1200, water_source: 'both', duration_days: 210, notes: 'Well suited to moderate rainfall and organic-rich soils.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Ginger', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, rich soil', min_temperature: 21, max_temperature: 29, min_seasonal_rainfall_mm: 800, max_seasonal_rainfall_mm: 1300, water_source: 'rainfed', duration_days: 210, notes: 'Works well where soils stay moist but free draining.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Coconut', climate_zone: 'Dry', season: 'Both', soil_types: 'Sandy loam, lateritic soil', min_temperature: 24, max_temperature: 33, min_seasonal_rainfall_mm: 1000, max_seasonal_rainfall_mm: 2000, water_source: 'rainfed', duration_days: 3650, notes: 'A perennial crop that suits low to moderate rainfall but requires deep soil and irrigation in dry years.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Coconut', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 23, max_temperature: 31, min_seasonal_rainfall_mm: 1200, max_seasonal_rainfall_mm: 2200, water_source: 'both', duration_days: 3650, notes: 'Well suited where soil is deep and rainfall is moderately distributed.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Coconut', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, lateritic soil', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 1500, max_seasonal_rainfall_mm: 2500, water_source: 'rainfed', duration_days: 3650, notes: 'Strong performance in wet zones with good drainage and fertile soils.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Tea', climate_zone: 'Dry', season: 'Both', soil_types: 'Well-drained loam, red loam', min_temperature: 18, max_temperature: 26, min_seasonal_rainfall_mm: 1500, max_seasonal_rainfall_mm: 2500, water_source: 'rainfed', duration_days: 365, notes: 'Tea is better suited to cooler, wetter upland and intermediate zones than dry lowlands.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Tea', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Well-drained loam', min_temperature: 18, max_temperature: 28, min_seasonal_rainfall_mm: 1500, max_seasonal_rainfall_mm: 2400, water_source: 'rainfed', duration_days: 365, notes: 'This climate zone is commonly suitable for tea cultivation.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Tea', climate_zone: 'Wet', season: 'Both', soil_types: 'Acidic loam, deep well-drained soil', min_temperature: 16, max_temperature: 26, min_seasonal_rainfall_mm: 1800, max_seasonal_rainfall_mm: 3000, water_source: 'rainfed', duration_days: 365, notes: 'Wet zones are usually the most suitable for tea; drainage and frequent rainfall matter.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Rubber', climate_zone: 'Dry', season: 'Both', soil_types: 'Well-drained loam, lateritic soil', min_temperature: 22, max_temperature: 32, min_seasonal_rainfall_mm: 1200, max_seasonal_rainfall_mm: 2200, water_source: 'rainfed', duration_days: 3650, notes: 'Rubber is typically better suited to humid and intermediate zones than very dry areas.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Rubber', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Well-drained loam, red yellow podzolic', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 1400, max_seasonal_rainfall_mm: 2400, water_source: 'rainfed', duration_days: 3650, notes: 'Suitable in humid intermediate conditions with good drainage.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Rubber', climate_zone: 'Wet', season: 'Both', soil_types: 'Deep loam, lateritic soil', min_temperature: 21, max_temperature: 29, min_seasonal_rainfall_mm: 1800, max_seasonal_rainfall_mm: 3000, water_source: 'rainfed', duration_days: 3650, notes: 'Wet zones often support rubber best when drainage is sound.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Black gram', climate_zone: 'Dry', season: 'Yala', soil_types: 'Loam, sandy loam', min_temperature: 26, max_temperature: 35, min_seasonal_rainfall_mm: 300, max_seasonal_rainfall_mm: 700, water_source: 'rainfed', duration_days: 70, notes: 'Short-season crop that suits dry-zone low-rainfall systems.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Black gram', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, sandy loam', min_temperature: 25, max_temperature: 33, min_seasonal_rainfall_mm: 400, max_seasonal_rainfall_mm: 800, water_source: 'both', duration_days: 70, notes: 'Good performer in moderate rainfall and warmer temperatures.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Black gram', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, well-drained soil', min_temperature: 24, max_temperature: 30, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'rainfed', duration_days: 70, notes: 'Rainfed production is possible but waterlogging should be avoided.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },

  { crop: 'Soybean', climate_zone: 'Dry', season: 'Maha', soil_types: 'Loam, sandy loam', min_temperature: 22, max_temperature: 32, min_seasonal_rainfall_mm: 500, max_seasonal_rainfall_mm: 900, water_source: 'rainfed', duration_days: 100, notes: 'A dry-to-intermediate zone option with moderate rainfall and good drainage.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Soybean', climate_zone: 'Intermediate', season: 'Both', soil_types: 'Loam, red yellow podzolic', min_temperature: 22, max_temperature: 30, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1000, water_source: 'both', duration_days: 100, notes: 'Suitable when rainfall distribution is regular.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
  { crop: 'Soybean', climate_zone: 'Wet', season: 'Both', soil_types: 'Loam, well-drained soil', min_temperature: 22, max_temperature: 28, min_seasonal_rainfall_mm: 600, max_seasonal_rainfall_mm: 1100, water_source: 'rainfed', duration_days: 100, notes: 'Depends on drainage and humidity management.', source: 'Department of Agriculture Sri Lanka crop suitability pages (to be verified)', verified: false },
];

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agrismartsl_new',
    multipleStatements: true,
  });

  try {
    await connection.beginTransaction();

    for (const [name, latitude, longitude, agroZone, climateZone] of districts) {
      await connection.execute(
        'INSERT IGNORE INTO districts (name, latitude, longitude, agro_ecological_zone, climate_zone) VALUES (?, ?, ?, ?, ?)',
        [name, latitude, longitude, agroZone, climateZone]
      );
    }

    for (const cropName of cropSeed) {
      await connection.execute(
        'INSERT IGNORE INTO crops (crop_name, description, suitable_soil, suitable_season) VALUES (?, ?, ?, ?)',
        [cropName, `Seeded crop profile for ${cropName}.`, 'General field suitability record', 'Both']
      );
    }

    const [cropRows] = await connection.execute('SELECT crop_id, crop_name FROM crops');
    const cropMap = new Map(cropRows.map((row) => [row.crop_name, row.crop_id]));
    const [existingRequirements] = await connection.execute(
      'SELECT crop_id, climate_zone, season FROM crop_requirements'
    );
    const requirementKeys = new Set(
      existingRequirements.map((row) => `${row.crop_id}:${row.climate_zone}:${row.season}`)
    );

    for (const requirement of cropRequirements) {
      const cropId = cropMap.get(requirement.crop);
      if (!cropId) continue;

      const key = `${cropId}:${requirement.climate_zone}:${requirement.season}`;
      if (requirementKeys.has(key)) continue;

      await connection.execute(
        `INSERT INTO crop_requirements (
          crop_id, climate_zone, season, soil_types, min_temperature, max_temperature,
          min_seasonal_rainfall_mm, max_seasonal_rainfall_mm, water_source, duration_days,
          notes, source, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cropId,
          requirement.climate_zone,
          requirement.season,
          requirement.soil_types,
          requirement.min_temperature,
          requirement.max_temperature,
          requirement.min_seasonal_rainfall_mm,
          requirement.max_seasonal_rainfall_mm,
          requirement.water_source,
          requirement.duration_days,
          requirement.notes,
          requirement.source,
          requirement.verified ? 1 : 0,
        ]
      );
      requirementKeys.add(key);
    }

    await connection.commit();
    console.log('District and crop requirement seeds completed.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seedDatabase().catch((error) => {
  console.error('Seed failed:', error.code || error.name || 'Unknown error');
  process.exit(1);
});
