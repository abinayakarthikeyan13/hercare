-- HerCare PostgreSQL Database Schema
-- Architecture: CIA Triad (Confidentiality via AES-256-GCM BYTEA, Integrity via SHA-256)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    phone_number VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    preferred_name VARCHAR(100),
    is_demo_user BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(5) DEFAULT 'en',
    cloud_sync_enabled BOOLEAN DEFAULT FALSE,
    privacy_agreement_accepted BOOLEAN DEFAULT FALSE,
    privacy_agreement_version VARCHAR(20) DEFAULT '1.0',
    privacy_agreement_date TIMESTAMP WITH TIME ZONE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. OTP Records Table
CREATE TABLE IF NOT EXISTS otp_records (
    id VARCHAR(36) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_lookup ON otp_records(phone_number, is_used, expires_at);

-- 3. Preferences Table (Encrypted BYTEA + SHA-256 Integrity Hash)
CREATE TABLE IF NOT EXISTS preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname_encrypted BYTEA NOT NULL,
    food_dislikes_encrypted BYTEA,
    exercise_pref_encrypted BYTEA,
    energy_level_encrypted BYTEA,
    record_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Cycle Records Table (Encrypted BYTEA + SHA-256 Integrity Hash)
CREATE TABLE IF NOT EXISTS cycle_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dates_encrypted BYTEA NOT NULL,
    start_date DATE,
    end_date DATE,
    cycle_length INTEGER,
    period_length INTEGER,
    symptoms_encrypted BYTEA,
    notes_encrypted BYTEA,
    record_hash VARCHAR(64) NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cycle_user_date ON cycle_records(user_id, start_date);

-- 5. Chat History Table (Encrypted BYTEA + SHA-256 Integrity Hash)
CREATE TABLE IF NOT EXISTS chat_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL,
    role VARCHAR(10) NOT NULL,
    language VARCHAR(5) DEFAULT 'en',
    content_encrypted BYTEA NOT NULL,
    record_hash VARCHAR(64) NOT NULL,
    red_flag_detected BOOLEAN DEFAULT FALSE,
    red_flag_category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_user_session ON chat_history(user_id, session_id);
