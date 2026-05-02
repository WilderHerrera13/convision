DROP SCHEMA IF EXISTS optica_main CASCADE;
CREATE SCHEMA optica_main;

DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' SET SCHEMA optica_main';
    END LOOP;
END $$;

DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' SET SCHEMA optica_main';
    END LOOP;
END $$;

INSERT INTO platform.opticas (slug, name, plan, schema_name, is_active)
VALUES ('main', 'Optica Principal', 'standard', 'optica_main', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO platform.optica_features (optica_id, feature_key, is_enabled)
SELECT (SELECT id FROM platform.opticas WHERE slug = 'main'), key, true
FROM unnest(ARRAY[
    'sidebar.appointments', 'sidebar.sales', 'sidebar.purchases',
    'sidebar.inventory', 'sidebar.laboratory', 'sidebar.reports',
    'sidebar.payroll', 'sidebar.expenses', 'sidebar.clinical',
    'sidebar.catalog', 'sidebar.quotes', 'sidebar.discounts'
]) AS key
ON CONFLICT (optica_id, feature_key) DO NOTHING;

INSERT INTO platform.super_admins (name, email, password_hash)
VALUES (
    'Super Admin',
    'superadmin@convision.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
)
ON CONFLICT (email) DO NOTHING;
