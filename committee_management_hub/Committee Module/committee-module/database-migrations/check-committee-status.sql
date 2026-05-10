-- Check what status values exist in committees table
SELECT id, name, status, created_at 
FROM committees 
ORDER BY created_at DESC;

-- If kdhui shows 'Recruiting' instead of 'Completed', run this to fix it:
-- UPDATE committees SET status = 'Completed' WHERE name = 'kdhui';
