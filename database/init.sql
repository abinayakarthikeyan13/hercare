-- HerCare PostgreSQL Database Initialization Schema
-- Privacy-First Menstrual Health Companion
-- Supports CIA Triad: Confidentiality (BYTEA encrypted payloads), Integrity (HMAC/SHA-256), Availability (UUID indexes)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_lookup VARCHAR(128) UNIQUE NOT NULL,
    phone_number VARCHAR(32),
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    cloud_sync_enabled BOOLEAN DEFAULT FALSE,
    token_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. OTP Challenges Table
CREATE TABLE IF NOT EXISTS otp_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_lookup VARCHAR(128) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Encrypted User Profiles (Nickname, Food dislikes, Exercise, Energy)
CREATE TABLE IF NOT EXISTS encrypted_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    encrypted_payload BYTEA NOT NULL,
    encryption_version VARCHAR(16) DEFAULT 'v1-aes256gcm',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Encrypted Cycle Records (Period start/end dates, flow, notes)
CREATE TABLE IF NOT EXISTS encrypted_cycle_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_payload BYTEA NOT NULL,
    encryption_version VARCHAR(16) DEFAULT 'v1-aes256gcm',
    integrity_mac VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Encrypted Symptom Records (Daily check-ins, mood, physical symptoms)
CREATE TABLE IF NOT EXISTS encrypted_symptom_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_payload BYTEA NOT NULL,
    encryption_version VARCHAR(16) DEFAULT 'v1-aes256gcm',
    integrity_mac VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Encrypted Chat Messages (AI Conversations, Red flag alerts)
CREATE TABLE IF NOT EXISTS encrypted_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_payload BYTEA NOT NULL,
    encryption_version VARCHAR(16) DEFAULT 'v1-aes256gcm',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Cloud Sync Consents
CREATE TABLE IF NOT EXISTS cloud_sync_consents (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE,
    consent_version VARCHAR(16) DEFAULT 'v1.0',
    consented_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- 8. Refresh Sessions
CREATE TABLE IF NOT EXISTS refresh_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone_lookup ON users(phone_lookup);
CREATE INDEX IF NOT EXISTS idx_otp_phone_lookup ON otp_challenges(phone_lookup);
CREATE INDEX IF NOT EXISTS idx_cycles_user_id ON encrypted_cycle_records(user_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_id ON encrypted_symptom_records(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON encrypted_chat_messages(user_id);
