-- Create registralearningsconfig table for storing configurable values
CREATE TABLE IF NOT EXISTS registralearningsconfig (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default values
INSERT IGNORE INTO registralearningsconfig (`key`, `value`) VALUES 
('reading_reward', '50'),
('hifz_reward', '100');