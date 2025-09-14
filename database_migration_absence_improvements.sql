-- Database Migration: Absence System Improvements
-- Add package breakdown support to absence records

-- Add columns to support package-based absence tracking
ALTER TABLE absencerecord 
ADD COLUMN IF NOT EXISTS packageBreakdown TEXT,
ADD COLUMN IF NOT EXISTS timeSlots TEXT,
ADD COLUMN IF NOT EXISTS uniqueTimeSlots TEXT;

-- Update existing records to have proper time slots
UPDATE absencerecord 
SET timeSlots = '["Whole Day"]'
WHERE timeSlots IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_absencerecord_teacher_date 
ON absencerecord(teacherId, classDate);

-- Create index for package breakdown queries
CREATE INDEX IF NOT EXISTS idx_absencerecord_package_breakdown 
ON absencerecord(packageBreakdown);

-- Add comment to document the new structure
COMMENT ON COLUMN absencerecord.packageBreakdown IS 'JSON array containing per-package deduction breakdown: [{"package": "Europe", "ratePerSlot": 30, "timeSlots": 1, "total": 30}]';
COMMENT ON COLUMN absencerecord.timeSlots IS 'JSON array of affected time slots: ["Whole Day"] or ["09:00-10:00", "10:00-11:00"]';
COMMENT ON COLUMN absencerecord.uniqueTimeSlots IS 'JSON array of unique time slot identifiers for the absence';