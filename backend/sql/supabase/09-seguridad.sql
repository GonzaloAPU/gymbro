-- Aplicar como administrador ANTES del backend de seguridad. Repetible; no borra datos deportivos.
BEGIN;
SELECT pg_advisory_xact_lock(20261106);
CREATE TABLE IF NOT EXISTS "gymbro".controles_seguridad (
 clave varchar(160) PRIMARY KEY,
 datos jsonb NOT NULL CHECK (jsonb_typeof(datos)='object'),
 vence_en timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS controles_seguridad_vence_en ON "gymbro".controles_seguridad(vence_en);
REVOKE ALL ON TABLE "gymbro".controles_seguridad FROM PUBLIC;
ALTER TABLE "gymbro".controles_seguridad ENABLE ROW LEVEL SECURITY;
DO $security$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE "gymbro".controles_seguridad FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE "gymbro".controles_seguridad FROM authenticated; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gymbro_backend') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE "gymbro".controles_seguridad TO gymbro_backend;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='gymbro' AND tablename='controles_seguridad' AND policyname='backend_security_counters') THEN
   CREATE POLICY backend_security_counters ON "gymbro".controles_seguridad TO gymbro_backend USING (true) WITH CHECK (true);
  END IF;
 END IF;
 IF to_regclass('"gymbro".migraciones_esquema') IS NOT NULL THEN
  INSERT INTO "gymbro".migraciones_esquema(version) VALUES('20261106_seguridad') ON CONFLICT DO NOTHING;
 ELSIF to_regclass('"gymbro".schema_migrations') IS NOT NULL THEN
  INSERT INTO "gymbro".schema_migrations(version) VALUES('20261106_seguridad') ON CONFLICT DO NOTHING;
 END IF;
END $security$;
COMMIT;
