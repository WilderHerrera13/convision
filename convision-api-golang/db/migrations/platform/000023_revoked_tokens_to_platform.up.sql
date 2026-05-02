-- Move revoked_tokens from optica_main to platform schema.
-- Rationale: revoked tokens are cross-tenant (JTI is globally unique).
-- The Authenticate middleware uses globalDB (search_path=public / platform),
-- so the table must live in platform, not in any tenant schema.
ALTER TABLE optica_main.revoked_tokens SET SCHEMA platform;
