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

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'recommendations' AND column_name = 'score') = 0,
    'ALTER TABLE recommendations ADD COLUMN score DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER recommendation_text',
    'SELECT 1'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'recommendations' AND column_name = 'season') = 0,
    'ALTER TABLE recommendations ADD COLUMN season ENUM(''Maha'', ''Yala'', ''Both'') NOT NULL DEFAULT ''Both'' AFTER score',
    'SELECT 1'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'recommendations' AND column_name = 'reasons_json') = 0,
    'ALTER TABLE recommendations ADD COLUMN reasons_json JSON NULL AFTER season',
    'SELECT 1'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'recommendations' AND column_name = 'warnings_json') = 0,
    'ALTER TABLE recommendations ADD COLUMN warnings_json JSON NULL AFTER reasons_json',
    'SELECT 1'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'recommendations' AND column_name = 'weather_snapshot_json') = 0,
    'ALTER TABLE recommendations ADD COLUMN weather_snapshot_json JSON NULL AFTER warnings_json',
    'SELECT 1'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'recommendations'
       AND index_name = 'uq_recommendations_user_crop_season_date') = 0,
    'CREATE UNIQUE INDEX uq_recommendations_user_crop_season_date ON recommendations (user_id, crop_id, season, (DATE(recommendation_date)))',
    'SELECT 1'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

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
