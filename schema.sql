-- ================================================
-- Business Connect — Clean Database Schema
-- ================================================

CREATE DATABASE IF NOT EXISTS business_connect;
USE business_connect;

-- ================================================
-- TABLE 1: users
-- Core identity and authentication table.
-- account_status controls platform access.
-- Only 'approved' users can log in.
-- ================================================
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    company_name    VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    UNIQUE NOT NULL,
    password        VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    gst_number      VARCHAR(15)     UNIQUE NOT NULL,
    cin_number      VARCHAR(21)     UNIQUE NOT NULL,
    role            ENUM('business', 'admin') DEFAULT 'business',
    account_status  ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ================================================
-- TABLE 2: business_profiles
-- Extended business info, filled after registration.
-- Linked 1-to-1 with users via user_id.
-- ================================================
CREATE TABLE business_profiles (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNIQUE NOT NULL,
    company_description TEXT,
    industry            VARCHAR(255),
    location            VARCHAR(255),
    website             VARCHAR(255),
    logo                VARCHAR(255),
    founded_year        YEAR,
    employee_count      INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================
-- TABLE 3: connections
-- Tracks connection requests between businesses.
-- sender_id sends the request, receiver_id receives it.
-- ================================================
CREATE TABLE connections (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sender_id   INT NOT NULL,
    receiver_id INT NOT NULL,
    status      ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================
-- TABLE 4: conversations
-- One conversation per pair of users.
-- user1_id is always MIN(user1, user2) to prevent duplicates.
-- This is enforced in the controller, not just DB.
-- ================================================
CREATE TABLE conversations (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user1_id    INT NOT NULL,
    user2_id    INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_conversation (user1_id, user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================
-- TABLE 5: messages
-- Messages belong to a conversation.
-- is_read tracks unread message count.
-- ================================================
CREATE TABLE messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id       INT NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)       REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================
-- TABLE 6: notifications
-- Platform notifications for users.
-- ================================================
CREATE TABLE notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        VARCHAR(50) NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

USE business_connect;

-- ================================================
-- Create analytics_monthly
-- One row per user per month.
-- All 3 inputs stored together — revenue, margin, clients.
-- Gross profit is computed at query time (revenue × margin / 100)
-- so we don't store a derived value.
-- ================================================

CREATE TABLE analytics_monthly (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    user_id              INT NOT NULL,
    month                TINYINT NOT NULL   COMMENT '1 = Jan, 12 = Dec',
    year                 YEAR NOT NULL,
    revenue              DECIMAL(15, 2) NOT NULL,
    gross_profit_margin  DECIMAL(5, 2) NOT NULL  COMMENT 'Percentage e.g. 42.5 means 42.5%',
    client_count         INT NOT NULL DEFAULT 0,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_month (user_id, month, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================
-- Create analytics_credibility_score fresh
-- Component names changed to match new design.
-- profile_score    = 0-30  (profile completeness)
-- analytics_score  = 0-40  (months of data entered)
-- network_score    = 0-15  (accepted connections)
-- tenure_score     = 0-15  (days on platform)
-- total_score      = 0-100
-- ================================================

CREATE TABLE analytics_credibility_score (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNIQUE NOT NULL,
    profile_score    TINYINT DEFAULT 0,
    analytics_score  TINYINT DEFAULT 0,
    network_score    TINYINT DEFAULT 0,
    tenure_score     TINYINT DEFAULT 0,
    total_score      TINYINT DEFAULT 0,
    computed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
