-- Fix invalid expiration dates in zoom_links table
UPDATE wpos_zoom_links 
SET expiration_date = NULL 
WHERE expiration_date < '2000-01-01' 
   OR MONTH(expiration_date) = 0 
   OR DAY(expiration_date) = 0; 