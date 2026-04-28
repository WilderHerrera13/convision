-- Fix branches_id_seq to be after the highest existing branch id
-- This prevents duplicate key violations when inserting new branches
-- after the seed data explicitly inserted id=1 without advancing the sequence.
SELECT setval('branches_id_seq', GREATEST(1, (SELECT COALESCE(MAX(id), 0) FROM branches)));
