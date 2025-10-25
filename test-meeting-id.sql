-- Check if meeting ID exists in database
SELECT 
    id,
    studentid,
    ustazid,
    zoom_meeting_id,
    session_status,
    zoom_actual_duration,
    sent_time
FROM wpos_zoom_links
WHERE zoom_meeting_id = '81909682893'
   OR zoom_meeting_id = 81909682893
   OR link LIKE '%81909682893%'
ORDER BY id DESC
LIMIT 5;

-- Check all recent zoom links
SELECT 
    id,
    zoom_meeting_id,
    session_status,
    zoom_actual_duration,
    DATE_FORMAT(sent_time, '%Y-%m-%d %H:%i:%s') as sent_time
FROM wpos_zoom_links
ORDER BY id DESC
LIMIT 10;














