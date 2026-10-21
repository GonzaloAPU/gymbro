/** Migración versionada y transaccional. Migra datos antes de retirar columnas redundantes. */
import { sequelize } from '../../src/db.js';
import { UserRestDay, RoutineSchedule, BodyWeightHistory } from '../../src/models/index.js';
import { exerciseData } from '../../src/data/exercise-catalog.js';
import { normalizeExerciseName } from '../../src/services/exercise-access.js';

export async function normalizeSchema() {
  await sequelize.transaction(async transaction => {
    const query = (sql, replacements) => sequelize.query(sql, {transaction,replacements});
    await query('SELECT pg_advisory_xact_lock(20261020)');
    await query('CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(80) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const [done] = await query("SELECT version FROM schema_migrations WHERE version='20261020_normalize'");
    if (done.length) return;
    // sync crea solo las tablas ausentes; los cambios sobre tablas existentes son explícitos abajo.
    await sequelize.sync({transaction});
    const [users] = await query('SELECT * FROM users');
    const [days] = await query('SELECT * FROM routine_days');
    for (const user of users) {
      for (const weekday of user.rest_days || []) await UserRestDay.findOrCreate({where:{userId:user.id,weekday},transaction});
      if (user.current_kg != null) {
        const latest = await BodyWeightHistory.findOne({where:{userId:user.id},order:[['recordedAt','DESC']],transaction});
        // Conserva un peso actual que no estuviera reflejado en el historial. Fecha = momento de migración.
        if (!latest || Number(latest.weightKg) !== Number(user.current_kg)) await BodyWeightHistory.create({userId:user.id,weightKg:user.current_kg},{transaction});
      }
    }
    for (const day of days) {
      for (const slot of day.schedule || []) await RoutineSchedule.findOrCreate({where:{routineDayId:day.id,weekday:slot.weekday,start:slot.start,end:slot.end},transaction});
    }
    await query('ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE');
    await query('ALTER TABLE exercises ADD COLUMN IF NOT EXISTS normalized_name varchar(255)');
    // PostgreSQL y JavaScript usan la misma normalización: tildes, mayúsculas y espacios.
    await query(String.raw`CREATE OR REPLACE FUNCTION gymbro_normalize_name(value text) RETURNS text
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
      SELECT lower(regexp_replace(btrim(regexp_replace(normalize(value, NFD), U&'[\0300-\036f]', '', 'g')), '\s+', ' ', 'g')) $$`);
    await query('UPDATE exercises SET normalized_name=gymbro_normalize_name(name)');
    const [exercises] = await query('SELECT id,name,normalized_name FROM exercises');
    const official = new Set(exerciseData.map(item=>normalizeExerciseName(item.name)));
    // No inventamos un propietario para datos heredados desconocidos. Abortamos antes de modificar el esquema.
    const unknown = exercises.filter(item=>!official.has(item.normalized_name));
    if (unknown.length) throw Error(`Hay ${unknown.length} ejercicios heredados fuera del catálogo. Asignales propietario antes de migrar.`);
    const names = new Set();
    for (const exercise of exercises) {
      if (names.has(exercise.normalized_name)) throw Error('Hay nombres equivalentes heredados. Se requiere revisar referencias antes de unificarlos.');
      names.add(exercise.normalized_name);
    }
    // Sustituye la unicidad global por una clave oficial y otra por propietario.
    await query(`DO $$ DECLARE item record; BEGIN
      FOR item IN SELECT c.conname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
      WHERE c.conrelid='exercises'::regclass AND c.contype='u' AND cardinality(c.conkey)=1 AND a.attname='name'
      LOOP EXECUTE format('ALTER TABLE exercises DROP CONSTRAINT %I',item.conname); END LOOP;
    END $$`);
    await query('ALTER TABLE exercises ALTER COLUMN normalized_name SET NOT NULL');
    await query('CREATE UNIQUE INDEX exercises_official_name_unique ON exercises(normalized_name) WHERE created_by_user_id IS NULL');
    await query('CREATE UNIQUE INDEX exercises_private_name_unique ON exercises(created_by_user_id,normalized_name) WHERE created_by_user_id IS NOT NULL');
    await query(`CREATE OR REPLACE FUNCTION gymbro_exercise_name_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      NEW.normalized_name := gymbro_normalize_name(NEW.name);
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.normalized_name,0));
      IF EXISTS (SELECT 1 FROM exercises e WHERE e.id<>NEW.id AND e.normalized_name=NEW.normalized_name
        AND (e.created_by_user_id IS NULL OR NEW.created_by_user_id IS NULL OR e.created_by_user_id=NEW.created_by_user_id))
      THEN RAISE EXCEPTION 'El ejercicio ya existe en ese catálogo' USING ERRCODE='23505'; END IF;
      RETURN NEW; END $$`);
    await query('CREATE TRIGGER exercises_name_guard BEFORE INSERT OR UPDATE OF name,created_by_user_id,normalized_name ON exercises FOR EACH ROW EXECUTE FUNCTION gymbro_exercise_name_guard()');
    // Restricciones comprobadas por SQL, también cuando se escribe desde pgAdmin o scripts.
    const checks = [
      ['user_rest_days','weekday_range','weekday BETWEEN 0 AND 6'],
      ['routine_schedules','weekday_range','weekday BETWEEN 0 AND 6'],
      ['routine_schedules','valid_time_range','start_time < end_time'],
      ['exercises','valid_type',"training_type IN ('POWER','AEROBIC','ANAEROBIC')"],
      ['exercises','valid_name',"length(normalized_name) >= 2 AND normalized_name=gymbro_normalize_name(name)"],
      ['body_weight_histories','valid_weight','weight_kg > 0 AND weight_kg <= 500'],
      ['routine_exercises','valid_targets','target_sets > 0 AND min_reps > 0 AND max_reps >= min_reps AND rest_seconds >= 0'],
      ['performed_sets','valid_values','set_number > 0 AND weight_kg >= 0 AND repetitions > 0 AND duration_seconds >= 0 AND actual_rest_seconds >= 0'],
    ];
    for (const [table,name,expression] of checks) await query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_${name} CHECK (${expression})`);
    // La transferencia ya terminó: cada dato tiene una sola fuente relacional.
    await query('ALTER TABLE users DROP COLUMN IF EXISTS rest_days, DROP COLUMN IF EXISTS current_kg');
    await query('ALTER TABLE routine_days DROP COLUMN IF EXISTS schedule');
    await query("INSERT INTO schema_migrations(version) VALUES ('20261020_normalize')");
  });
}
