function normalizeText(value) {
  return String(value || '').trim();
}

function detectSeason(date) {
  const now = new Date(date || Date.now());
  const month = now.getMonth() + 1;
  return month >= 10 || month <= 3 ? 'Maha' : 'Yala';
}

function computeSeasonScore(cropSeason, currentSeason) {
  if (!cropSeason || cropSeason === 'Both') return 25;
  if (cropSeason === currentSeason) return 25;
  return 8;
}

function computeSoilScore(soilType, soilText) {
  const normalizedSoil = normalizeText(soilType).toLowerCase();
  if (!normalizedSoil) return 10;
  const soils = normalizeText(soilText).toLowerCase();
  if (!soils) return 10;
  if (soils.includes(normalizedSoil) || normalizedSoil.includes(soils)) return 25;
  return 12;
}

function computeTemperatureScore(currentTemp, minTemp, maxTemp) {
  if (!Number.isFinite(currentTemp) || !Number.isFinite(minTemp) || !Number.isFinite(maxTemp)) {
    return 16;
  }
  const midpoint = ((Number(minTemp) + Number(maxTemp)) / 2);
  const spread = Number(maxTemp) - Number(minTemp);
  const distance = Math.abs(currentTemp - midpoint);
  const penalty = Math.max(0, distance - spread * 0.4);
  const value = Math.max(0, 20 - penalty * 2.5);
  return Math.min(20, value);
}

function computeRainfallScore(currentRainfall, minRainfall, maxRainfall, normals) {
  const forecastRain = Number(currentRainfall || 0);
  const min = Number(minRainfall || 0);
  const max = Number(maxRainfall || 0);

  if (!Number.isFinite(forecastRain)) {
    return 15;
  }

  if (forecastRain >= min && forecastRain <= max) {
    return 20;
  }

  const idealRange = max - min || 200;
  const proximity = Math.min(1, Math.abs(forecastRain - ((min + max) / 2)) / idealRange);
  return Math.max(4, 20 - (proximity * 16));
}

function computeWaterScore(waterSource, cropSource) {
  const source = normalizeText(waterSource).toLowerCase();
  const crop = normalizeText(cropSource).toLowerCase();
  if (!source) return 8;
  if (!crop) return 8;
  if (crop === 'both') return 10;
  if (source === crop) return 10;
  return 5;
}

function getLabel(score) {
  if (score >= 80) return 'Highly suitable';
  if (score >= 60) return 'Moderately suitable';
  if (score >= 40) return 'Marginal';
  return 'Not recommended';
}

function buildReasons(requirement, normalizedSoil, season, weather) {
  const reasons = [];
  if (requirement.soil_types) {
    reasons.push(`Soil matches: ${requirement.soil_types}`);
  }
  if (requirement.climate_zone) {
    reasons.push(`Climate zone: ${requirement.climate_zone}`);
  }
  if (season && (requirement.season === season || requirement.season === 'Both')) {
    reasons.push(`Season matches: ${requirement.season === 'Both' ? 'suitable in both seasons' : `suitable for ${season}`}`);
  }
  if (weather && Number.isFinite(weather.temperature)) {
    reasons.push(`Current temperature is within the expected range for this crop.`);
  }
  if (normalizedSoil && requirement.soil_types && requirement.soil_types.toLowerCase().includes(normalizedSoil.toLowerCase())) {
    reasons.push(`Farmer soil type aligns with the preferred soil profile.`);
  }
  return reasons.slice(0, 4);
}

function buildWarnings(requirement, season, weather, cropName) {
  const warnings = [];
  if (weather && Number.isFinite(weather.rainfall_24h) && weather.rainfall_24h > 50) {
    warnings.push('Heavy rain is forecast; avoid waterlogging risk in low-lying fields.');
  }
  if (weather && Number.isFinite(weather.temperature) && (weather.temperature < 18 || weather.temperature > 35)) {
    warnings.push('Temperature is outside the comfort range for many field crops; monitor irrigation and crop stress.');
  }
  if (season && requirement.season && requirement.season !== 'Both' && requirement.season !== season) {
    warnings.push(`This crop is usually better matched to ${requirement.season} rather than ${season}.`);
  }
  if (weather && Number.isFinite(weather.rainfall_24h) && weather.rainfall_24h < 10 && requirement.water_source === 'rainfed') {
    warnings.push('Rainfed crop choice may be risky in a dry spell; consider irrigation or a lower-water alternative.');
  }
  if (!warnings.length && weather && Number.isFinite(weather.temperature)) {
    warnings.push('Normal field conditions; confirm with your agriculture officer before final planting decisions.');
  }
  return warnings.slice(0, 4);
}

function generateCropRecommendations({
  district,
  soil_type,
  water_source = 'both',
  weather = {},
  cropRequirements = [],
  date = new Date(),
}) {
  const results = [];
  const season = detectSeason(date);
  const normalizedSoil = normalizeText(soil_type).toLowerCase();
  const currentTemp = Number(weather.temperature ?? 0);
  const rainfall = Number(weather.rainfall_24h ?? 0);

  cropRequirements.forEach((requirement) => {
    if (!requirement) return;
    const requirementSeason = requirement.season || 'Both';
    const seasonScore = computeSeasonScore(requirementSeason, season);
    const soilScore = computeSoilScore(soil_type, requirement.soil_types);
    const tempScore = computeTemperatureScore(currentTemp, requirement.min_temperature, requirement.max_temperature);
    const rainfallScore = computeRainfallScore(rainfall, requirement.min_seasonal_rainfall_mm, requirement.max_seasonal_rainfall_mm, weather.climate_normals || []);
    const waterScore = computeWaterScore(water_source, requirement.water_source);

    let score = seasonScore + soilScore + tempScore + rainfallScore + waterScore;

    if (!normalizedSoil) {
      score -= 15;
    }

    const reasons = buildReasons(requirement, normalizedSoil, season, weather);
    const warnings = buildWarnings(requirement, season, weather, requirement.crop_name);

    results.push({
      crop_id: requirement.crop_id,
      crop_name: requirement.crop_name || 'Crop',
      season,
      score: Number(score.toFixed(2)),
      label: getLabel(score),
      reasons,
      warnings,
      requirement,
    });
  });

  const ranked = results
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      crop_id: item.crop_id,
      crop_name: item.crop_name,
      score: item.score,
      label: item.label,
      season: item.season,
      reasons: item.reasons,
      warnings: item.warnings,
    }));

  const valid = ranked.filter((item) => item.score >= 40);
  const final = valid.length ? valid : ranked.slice(0, 3).map((item) => ({
    ...item,
    label: 'Closest match',
    reasons: item.reasons.length ? item.reasons : ['No strong match found; consult a local agriculture officer.'],
    warnings: item.warnings.length ? item.warnings : ['This recommendation is only a decision-support suggestion.'],
  }));

  return final.slice(0, 5);
}

module.exports = {
  detectSeason,
  generateCropRecommendations,
  getLabel,
};
