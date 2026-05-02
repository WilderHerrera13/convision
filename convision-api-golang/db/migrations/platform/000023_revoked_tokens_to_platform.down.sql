-- Reverse: move revoked_tokens back to optica_main schema.
ALTER TABLE platform.revoked_tokens SET SCHEMA optica_main;
