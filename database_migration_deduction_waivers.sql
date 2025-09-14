-- Database Migration: Deduction Waivers System
-- Creates proper waiver tracking for deduction adjustments

-- Create deduction_waivers table
CREATE TABLE IF NOT EXISTS deduction_waivers (
  id SERIAL PRIMARY KEY,
  teacherId VARCHAR(255) NOT NULL,
  deductionType ENUM('lateness', 'absence') NOT NULL,
  deductionDate DATE NOT NULL,
  originalAmount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  adminId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_teacher_date (teacherId, deductionDate),
  INDEX idx_type_date (deductionType, deductionDate),
  INDEX idx_admin (adminId),
  
  -- Unique constraint to prevent duplicate waivers
  UNIQUE KEY unique_waiver (teacherId, deductionType, deductionDate)
);

-- Add waiver tracking to existing tables (if columns don't exist)
ALTER TABLE absencerecord 
ADD COLUMN IF NOT EXISTS isWaived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS waiverReason TEXT;

-- Add indexes for waiver queries
CREATE INDEX IF NOT EXISTS idx_absencerecord_waived ON absencerecord(teacherId, isWaived);

-- Comments for documentation
COMMENT ON TABLE deduction_waivers IS 'Tracks all deduction waivers/adjustments made by admins';
COMMENT ON COLUMN deduction_waivers.teacherId IS 'ID of the teacher whose deduction was waived';
COMMENT ON COLUMN deduction_waivers.deductionType IS 'Type of deduction: lateness or absence';
COMMENT ON COLUMN deduction_waivers.deductionDate IS 'Date of the original deduction';
COMMENT ON COLUMN deduction_waivers.originalAmount IS 'Original deduction amount that was waived';
COMMENT ON COLUMN deduction_waivers.reason IS 'Admin reason for waiving the deduction';
COMMENT ON COLUMN deduction_waivers.adminId IS 'ID of admin who made the waiver';