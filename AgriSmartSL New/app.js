const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connection = require('./config/database');
const { getWeatherForDistrict, allowedDistricts } = require('./services/weatherService');
const { generateCropRecommendations, detectSeason } = require('./services/recommendationEngine');
const { requireAuth, requireAdmin, validateEmail, validateDistrict } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'agrismartsl_local_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 1000,
    },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login or registration attempts. Please try again later.' },
});

app.use(['/login', '/register'], authLimiter);

function normalizeText(value) {
  return String(value || '').trim();
}

function isValidDistrictName(name) {
  return allowedDistricts.includes(String(name || '').trim());
}

function verifyAdminPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

app.get('/', (req, res) => res.redirect('/login.html'));

app.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, district, password, confirm_password } = req.body;

    if (!full_name || !email || !district || !password || !confirm_password) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please use a valid email address.' });
    }

    if (!validateDistrict(district) || !isValidDistrictName(district)) {
      return res.status(400).json({ success: false, message: 'Please select a valid Sri Lankan district.' });
    }

    if (!verifyAdminPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least 8 characters.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const normalizedEmail = normalizeText(email).toLowerCase();
    const [existingRows] = await connection.promise().query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);

    if (existingRows.length > 0) {
      return res.status(409).json({ success: false, message: 'This email is already registered. Please login instead.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.promise().query(
      'INSERT INTO users (full_name, email, phone, password, role, district, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [normalizeText(full_name), normalizedEmail, phone ? normalizeText(phone) : null, hashedPassword, 'farmer', normalizeText(district), 'active']
    );

    return res.status(201).json({ success: true, message: 'Your farmer account has been created successfully.' });
  } catch (error) {
    console.error('Registration failed:', error.code || error.name || 'Unknown error');
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your email and password.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const normalizedEmail = normalizeText(email).toLowerCase();
    const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    if (user.account_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is currently inactive.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.regenerate((error) => {
      if (error) {
        return res.status(500).json({ success: false, message: 'Unable to create your session.' });
      }

      req.session.user_id = user.user_id;
      req.session.full_name = user.full_name;
      req.session.email = user.email;
      req.session.role = user.role;

      if (user.role === 'admin') {
        return res.json({ success: true, message: 'Login successful! Welcome back.', redirect: '/admin-dashboard.html' });
      }

      if (user.role === 'farmer') {
        return res.json({ success: true, message: 'Login successful! Welcome back.', redirect: '/farmer-dashboard.html' });
      }

      return res.status(403).json({ success: false, message: 'Invalid user role.' });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify your login. Please try again.' });
  }
});

app.get('/current-user', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ success: false, message: 'User is not logged in.' });
  }

  return res.json({
    success: true,
    user: {
      user_id: req.session.user_id,
      full_name: req.session.full_name,
      email: req.session.email,
      role: req.session.role,
    },
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).send('Unable to log out.');
    }
    res.clearCookie('connect.sid');
    return res.redirect('/login.html');
  });
});

app.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'farmer') AS totalFarmers,
        (SELECT COUNT(*) FROM crops) AS totalCrops,
        (SELECT COUNT(*) FROM crop_requirements) AS totalCropRules,
        (SELECT COUNT(*) FROM advisory_tips) AS totalAdvisories
    `);

    return res.json({ success: true, ...rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load statistics.' });
  }
});

app.get('/admin/farmers', requireAdmin, async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`
      SELECT user_id, full_name, email, phone, district, farm_size, farm_size_unit, primary_crop, soil_type, account_status
      FROM users WHERE role = 'farmer' ORDER BY user_id DESC
    `);
    return res.json({ success: true, farmers: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load farmers.' });
  }
});

app.get('/admin/crop-rules', requireAdmin, async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`
      SELECT cr.requirement_id AS rule_id, cr.crop_id, c.crop_name, cr.climate_zone AS suitable_district, cr.soil_types AS soil_type,
             cr.min_temperature, cr.max_temperature, cr.min_seasonal_rainfall_mm AS min_humidity, cr.max_seasonal_rainfall_mm AS max_humidity,
             cr.notes AS recommendation_note
      FROM crop_requirements cr
      INNER JOIN crops c ON cr.crop_id = c.crop_id
      ORDER BY c.crop_name ASC
    `);
    return res.json({ success: true, cropRules: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load crop rules.' });
  }
});

app.get('/farmer/profile', requireAuth, async (req, res) => {
  if (req.session.role !== 'farmer') {
    return res.status(401).json({ success: false, message: 'Access denied.' });
  }

  try {
    const [rows] = await connection.promise().query(
      'SELECT user_id, full_name, email, phone, district, address, farm_size, farm_size_unit, primary_crop, soil_type FROM users WHERE user_id = ?',
      [req.session.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found.' });
    }

    return res.json({ success: true, farmer: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load profile.' });
  }
});

app.put('/farmer/profile', requireAuth, async (req, res) => {
  if (req.session.role !== 'farmer') {
    return res.status(401).json({ success: false, message: 'Access denied.' });
  }

  const { full_name, phone, district, address, farm_size, farm_size_unit, primary_crop, soil_type } = req.body;

  if (!full_name || !district) {
    return res.status(400).json({ success: false, message: 'Full name and district are required.' });
  }

  if (!isValidDistrictName(district)) {
    return res.status(400).json({ success: false, message: 'Please select a valid Sri Lankan district.' });
  }

  if (farm_size !== undefined && farm_size !== null && farm_size !== '' && Number(farm_size) < 0) {
    return res.status(400).json({ success: false, message: 'Farm size cannot be negative.' });
  }

  try {
    await connection.promise().query(
      `UPDATE users SET full_name = ?, phone = ?, district = ?, address = ?, farm_size = ?, farm_size_unit = ?, primary_crop = ?, soil_type = ? WHERE user_id = ?`,
      [
        normalizeText(full_name),
        phone ? normalizeText(phone) : null,
        normalizeText(district),
        address ? normalizeText(address) : null,
        farm_size === '' || farm_size === null || farm_size === undefined ? null : Number(farm_size),
        farm_size_unit || 'acres',
        primary_crop ? normalizeText(primary_crop) : null,
        soil_type ? normalizeText(soil_type) : null,
        req.session.user_id,
      ]
    );

    req.session.full_name = normalizeText(full_name);
    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
});

app.get('/api/weather', requireAuth, async (req, res) => {
  if (req.session.role !== 'farmer') {
    return res.status(401).json({ success: false, message: 'Please log in as a farmer.' });
  }

  const district = String(req.query.district || '').trim();
  const selectedDistrict = district || req.session.district || 'Anuradhapura';

  if (!isValidDistrictName(selectedDistrict)) {
    return res.status(400).json({ success: false, message: 'Please select a valid district.' });
  }

  const weatherData = await getWeatherForDistrict(selectedDistrict);
  return res.json(weatherData);
});

app.post('/api/crop-recommendations', requireAuth, async (req, res) => {
  if (req.session.role !== 'farmer') {
    return res.status(401).json({ success: false, message: 'Please log in as a farmer.' });
  }

  try {
    const { district, soil_type, water_source, override } = req.body || {};

    const [userRows] = await connection.promise().query(
      'SELECT district, soil_type FROM users WHERE user_id = ? LIMIT 1',
      [req.session.user_id]
    );

    const savedProfile = userRows[0] || {};
    const selectedDistrict = normalizeText(override && override.district ? override.district : (district || savedProfile.district || 'Anuradhapura'));
    const selectedSoil = normalizeText(override && override.soil_type ? override.soil_type : (soil_type || savedProfile.soil_type || 'Loam'));
    const selectedWaterSource = normalizeText(water_source || 'both').toLowerCase();

    if (!isValidDistrictName(selectedDistrict)) {
      return res.status(400).json({ success: false, message: 'Please select a valid Sri Lankan district.' });
    }

    const weatherResult = await getWeatherForDistrict(selectedDistrict);
    const season = detectSeason(new Date());

    const [districtRows] = await connection.promise().query(
      'SELECT climate_zone FROM districts WHERE name = ? LIMIT 1',
      [selectedDistrict]
    );
    const climateZone = districtRows[0]?.climate_zone || 'Dry';

    const [cropRows] = await connection.promise().query(
      `SELECT cr.*, c.crop_name FROM crop_requirements cr INNER JOIN crops c ON cr.crop_id = c.crop_id WHERE cr.climate_zone = ? AND (cr.season = ? OR cr.season = 'Both') ORDER BY c.crop_name ASC`,
      [climateZone, season]
    );

    const recommendationList = generateCropRecommendations({
      district: selectedDistrict,
      soil_type: selectedSoil,
      water_source: selectedWaterSource,
      weather: weatherResult.weather || {},
      cropRequirements: cropRows,
      date: new Date(),
    });

    const insertPromises = recommendationList.map(async (item) => {
      const recommendationText = `${item.crop_name} is recommended because it matches current seasonal and soil conditions.`;
      await connection.promise().query(
        `INSERT INTO recommendations (user_id, crop_id, recommendation_text, score, season, reasons_json, warnings_json, weather_snapshot_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE recommendation_text = VALUES(recommendation_text), score = VALUES(score), season = VALUES(season), reasons_json = VALUES(reasons_json), warnings_json = VALUES(warnings_json), weather_snapshot_json = VALUES(weather_snapshot_json)`,
        [
          req.session.user_id,
          item.crop_id,
          recommendationText,
          item.score,
          item.season,
          JSON.stringify(item.reasons),
          JSON.stringify(item.warnings),
          JSON.stringify({ district: selectedDistrict, temperature: weatherResult.weather?.temperature, rainfall_24h: weatherResult.weather?.rainfall_24h })
        ]
      );
    });

    await Promise.all(insertPromises);

    return res.json({
      success: true,
      season,
      district: selectedDistrict,
      soil_type: selectedSoil,
      weather: weatherResult.weather,
      recommendations: recommendationList,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to generate crop recommendations.' });
  }
});

app.get('/api/recommendation-history', requireAuth, async (req, res) => {
  if (req.session.role !== 'farmer') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  try {
    const [rows] = await connection.promise().query(
      `SELECT r.recommendation_id, r.crop_id, r.recommendation_text, r.recommendation_date, r.score, r.season, r.reasons_json, r.warnings_json, c.crop_name, c.description
       FROM recommendations r INNER JOIN crops c ON r.crop_id = c.crop_id WHERE r.user_id = ? ORDER BY r.recommendation_date DESC LIMIT 5`,
      [req.session.user_id]
    );
    return res.json({ success: true, history: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load recommendation history.' });
  }
});

app.get('/api/advisory-tips', requireAuth, async (req, res) => {
  if (req.session.role !== 'farmer') {
    return res.status(401).json({ success: false, message: 'Please log in as a farmer.' });
  }

  try {
    const [rows] = await connection.promise().query('SELECT tip_id, title, description, category, created_at FROM advisory_tips ORDER BY created_at DESC');
    return res.json({ success: true, advisories: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load farm advisory information.' });
  }
});

app.get('/admin/advisories', requireAdmin, async (req, res) => {
  try {
    const [rows] = await connection.promise().query('SELECT tip_id, title, description, category, created_at FROM advisory_tips ORDER BY created_at DESC');
    return res.json({ success: true, advisories: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load advisories.' });
  }
});

app.post('/admin/advisories', requireAdmin, async (req, res) => {
  const { title, description, category } = req.body || {};
  if (!title || !description || !category) {
    return res.status(400).json({ success: false, message: 'Title, description and category are required.' });
  }

  try {
    await connection.promise().query(
      'INSERT INTO advisory_tips (title, description, category) VALUES (?, ?, ?)',
      [normalizeText(title), normalizeText(description), normalizeText(category)]
    );
    return res.status(201).json({ success: true, message: 'Advisory created successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create advisory.' });
  }
});

app.get('/admin/crops', requireAdmin, async (req, res) => {
  try {
    const [rows] = await connection.promise().query('SELECT crop_id, crop_name, description, suitable_soil, suitable_season FROM crops ORDER BY crop_name ASC');
    return res.json({ success: true, crops: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load crops.' });
  }
});

app.post('/admin/crops', requireAdmin, async (req, res) => {
  const { crop_name, description, suitable_soil, suitable_season } = req.body || {};
  if (!crop_name) {
    return res.status(400).json({ success: false, message: 'Crop name is required.' });
  }

  try {
    await connection.promise().query(
      'INSERT INTO crops (crop_name, description, suitable_soil, suitable_season) VALUES (?, ?, ?, ?)',
      [normalizeText(crop_name), normalizeText(description || ''), normalizeText(suitable_soil || ''), normalizeText(suitable_season || 'Both')]
    );
    return res.status(201).json({ success: true, message: 'Crop created successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create crop.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    // intentionally silent when not needed; no secrets printed
  });
}

module.exports = app;
