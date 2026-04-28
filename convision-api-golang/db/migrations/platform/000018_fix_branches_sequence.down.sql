-- No rollback needed — setval is safe and idempotent.
-- The sequence was already advanced; setting it back would risk duplicates.
SELECT 1;
