DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'optica_main'
    LOOP
        EXECUTE 'ALTER TABLE optica_main.' || quote_ident(r.tablename) || ' SET SCHEMA public';
    END LOOP;
END $$;

DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'optica_main'
    LOOP
        EXECUTE 'ALTER SEQUENCE optica_main.' || quote_ident(r.sequencename) || ' SET SCHEMA public';
    END LOOP;
END $$;

DELETE FROM platform.optica_features
WHERE optica_id = (SELECT id FROM platform.opticas WHERE slug = 'main');

DELETE FROM platform.super_admins WHERE email = 'superadmin@convision.com';

DELETE FROM platform.opticas WHERE slug = 'main';

DROP SCHEMA IF EXISTS optica_main CASCADE;
