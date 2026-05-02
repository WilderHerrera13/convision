-- QA-005: insert feature flags that were missing from the initial seed (000022).
-- sidebar.cash_close, sidebar.advisor_report, and sidebar.specialist_management
-- are defined in domain/feature_flag.go but were never added to existing opticas.
INSERT INTO platform.optica_features (optica_id, feature_key, is_enabled)
SELECT o.id, key, true
FROM platform.opticas o
CROSS JOIN unnest(ARRAY[
    'sidebar.cash_close',
    'sidebar.advisor_report',
    'sidebar.specialist_management'
]) AS key
ON CONFLICT (optica_id, feature_key) DO NOTHING;
