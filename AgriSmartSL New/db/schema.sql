CREATE TABLE IF NOT EXISTS users (
    user_id INT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('farmer', 'admin') NOT NULL DEFAULT 'farmer',
    district VARCHAR(100) NOT NULL,
    address TEXT NULL,
    farm_size DECIMAL(10,2) NULL,
    farm_size_unit ENUM('acres', 'hectares') NULL DEFAULT 'acres',
    primary_crop VARCHAR(150) NULL,
    soil_type VARCHAR(100) NULL,
    account_status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crops (
    crop_id INT NOT NULL AUTO_INCREMENT,
    crop_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    suitable_soil VARCHAR(255) NULL,
    suitable_season VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (crop_id),
    UNIQUE KEY uq_crops_name (crop_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crop_rules (
    rule_id INT NOT NULL AUTO_INCREMENT,
    crop_id INT NOT NULL,
    suitable_district VARCHAR(100) NOT NULL,
    soil_type VARCHAR(100) NOT NULL,
    min_temperature DECIMAL(5,2) NOT NULL,
    max_temperature DECIMAL(5,2) NOT NULL,
    min_humidity DECIMAL(5,2) NOT NULL,
    max_humidity DECIMAL(5,2) NOT NULL,
    recommendation_note TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rule_id),
    KEY idx_crop_rules_crop (crop_id),
    KEY idx_crop_rules_district (suitable_district),
    CONSTRAINT fk_crop_rules_crop
        FOREIGN KEY (crop_id) REFERENCES crops(crop_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS advisory_tips (
    tip_id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    crop_id INT NOT NULL,
    recommendation_text TEXT NOT NULL,
    recommendation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    season ENUM('Maha', 'Yala', 'Both') NOT NULL DEFAULT 'Both',
    reasons_json JSON NULL,
    warnings_json JSON NULL,
    weather_snapshot_json JSON NULL,
    PRIMARY KEY (recommendation_id),
    KEY idx_recommendations_user (user_id),
    KEY idx_recommendations_crop (crop_id),
    KEY idx_recommendations_season_date (season, recommendation_date),
    CONSTRAINT fk_recommendations_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_recommendations_crop
        FOREIGN KEY (crop_id) REFERENCES crops(crop_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    UNIQUE KEY uq_recommendations_user_crop_season_date (user_id, crop_id, season, (DATE(recommendation_date)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS districts (
    district_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    agro_ecological_zone VARCHAR(100) NULL,
    climate_zone ENUM('Dry', 'Intermediate', 'Wet') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (district_id),
    UNIQUE KEY uq_districts_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crop_requirements (
    requirement_id INT NOT NULL AUTO_INCREMENT,
    crop_id INT NOT NULL,
    climate_zone ENUM('Dry', 'Intermediate', 'Wet') NOT NULL,
    season ENUM('Maha', 'Yala', 'Both') NOT NULL,
    soil_types TEXT NOT NULL,
    min_temperature DECIMAL(5,2) NULL,
    max_temperature DECIMAL(5,2) NULL,
    min_seasonal_rainfall_mm DECIMAL(10,2) NULL,
    max_seasonal_rainfall_mm DECIMAL(10,2) NULL,
    water_source ENUM('irrigated', 'rainfed', 'both') NOT NULL DEFAULT 'both',
    duration_days INT NULL,
    notes TEXT NULL,
    source VARCHAR(255) NOT NULL,
    verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (requirement_id),
    KEY idx_crop_requirements_crop (crop_id),
    KEY idx_crop_requirements_zone_season (climate_zone, season),
    CONSTRAINT fk_crop_requirements_crop
        FOREIGN KEY (crop_id) REFERENCES crops(crop_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS weather_logs (
    weather_log_id BIGINT NOT NULL AUTO_INCREMENT,
    district VARCHAR(100) NOT NULL,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature DECIMAL(6,2) NULL,
    humidity DECIMAL(6,2) NULL,
    rainfall_24h DECIMAL(8,2) NULL,
    forecast_json JSON NULL,
    stale TINYINT(1) NOT NULL DEFAULT 0,
    source VARCHAR(255) NOT NULL DEFAULT 'OpenWeatherMap',
    PRIMARY KEY (weather_log_id),
    KEY idx_weather_logs_district_time (district, fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS climate_normals (
    normal_id BIGINT NOT NULL AUTO_INCREMENT,
    district VARCHAR(100) NOT NULL,
    month TINYINT NOT NULL,
    avg_temp DECIMAL(6,2) NULL,
    avg_rainfall_mm DECIMAL(8,2) NULL,
    source VARCHAR(255) NOT NULL DEFAULT 'Open-Meteo historical climate API',
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (normal_id),
    UNIQUE KEY uq_climate_normals_district_month (district, month),
    KEY idx_climate_normals_district (district)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id BIGINT NOT NULL AUTO_INCREMENT,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NULL,
    action VARCHAR(100) NOT NULL,
    changed_by INT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSON NULL,
    PRIMARY KEY (audit_id),
    KEY idx_audit_log_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
