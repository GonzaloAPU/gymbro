import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  goal: DataTypes.STRING,
  heightCm: DataTypes.INTEGER,
  currentKg: DataTypes.DECIMAL(5, 2),
  gymName: DataTypes.STRING,
  discipline: DataTypes.STRING,
  photoUrl: DataTypes.TEXT,
  restDays: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
});

export const Exercise = sequelize.define("Exercise", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  muscleGroup: { type: DataTypes.STRING, allowNull: false },
  equipment: { type: DataTypes.STRING, allowNull: false },
  movementPattern: DataTypes.STRING,
  trainingType: { type: DataTypes.STRING, allowNull: false, defaultValue: "POWER" },
}, { timestamps: false });

export const Routine = sequelize.define("Routine", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  goal: { type: DataTypes.STRING, allowNull: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { updatedAt: false });

export const RoutineDay = sequelize.define("RoutineDay", {
  favorite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  schedule: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  dayNumber: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: false, indexes: [{ unique: true, fields: ["routine_id", "day_number"] }] });

export const RoutineExercise = sequelize.define("RoutineExercise", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  order: { type: DataTypes.INTEGER, allowNull: false },
  targetSets: { type: DataTypes.INTEGER, allowNull: false },
  minReps: { type: DataTypes.INTEGER, allowNull: false },
  maxReps: { type: DataTypes.INTEGER, allowNull: false },
  restSeconds: { type: DataTypes.INTEGER, defaultValue: 90 },
  targetDurationMinutes: DataTypes.INTEGER,
  targetDistanceKm: DataTypes.DECIMAL(7, 2),
  intensity: DataTypes.STRING,
}, { timestamps: false, indexes: [{ unique: true, fields: ["routine_day_id", "order"] }] });

export const RoutineSchedule = sequelize.define('RoutineSchedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  weekday: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 6 } },
  start: { type: DataTypes.TIME, field: 'start_time', allowNull: false },
  end: { type: DataTypes.TIME, field: 'end_time', allowNull: false },
}, { tableName: 'routine_schedules', indexes: [{ unique: true, fields: ['routine_day_id', 'weekday', 'start_time', 'end_time'] }] });

export const TrainingSession = sequelize.define("TrainingSession", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  finishedAt: DataTypes.DATE,
  durationSeconds: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM("ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"), defaultValue: "ACTIVE" },
  calories: DataTypes.DECIMAL(7, 2),
  totalVolumeKg: DataTypes.DECIMAL(12, 2),
}, { timestamps: false, indexes: [{ fields: ["user_id", "started_at"] }] });

export const PerformedExercise = sequelize.define("PerformedExercise", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  order: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: false, indexes: [{ unique: true, fields: ["session_id", "order"] }] });

export const PerformedSet = sequelize.define("PerformedSet", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  setNumber: { type: DataTypes.INTEGER, allowNull: false },
  weightKg: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
  repetitions: { type: DataTypes.INTEGER, allowNull: false },
  durationSeconds: DataTypes.INTEGER,
  actualRestSeconds: DataTypes.INTEGER,
  completedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false, indexes: [{ unique: true, fields: ["performed_exercise_id", "set_number"] }] });

export const BodyWeightHistory = sequelize.define("BodyWeightHistory", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  weightKg: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  recordedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false, indexes: [{ fields: ["user_id", "recorded_at"] }] });

export const StrengthRecord = sequelize.define("StrengthRecord", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  maxWeightKg: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
  repetitions: { type: DataTypes.INTEGER, allowNull: false },
  estimatedOneRm: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
  achievedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false, indexes: [{ fields: ["user_id", "exercise_id", "estimated_one_rm"] }] });

User.hasMany(Routine, { foreignKey: { name: "userId", allowNull: false }, as: "routines", onDelete: "CASCADE" });
Routine.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(TrainingSession, { foreignKey: { name: "userId", allowNull: false }, as: "sessions", onDelete: "CASCADE" });
TrainingSession.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(BodyWeightHistory, { foreignKey: { name: "userId", allowNull: false }, as: "weights", onDelete: "CASCADE" });
BodyWeightHistory.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(StrengthRecord, { foreignKey: { name: "userId", allowNull: false }, as: "records", onDelete: "CASCADE" });
StrengthRecord.belongsTo(User, { foreignKey: "userId", as: "user" });

Routine.hasMany(RoutineDay, { foreignKey: { name: "routineId", allowNull: false }, as: "days", onDelete: "CASCADE" });
RoutineDay.belongsTo(Routine, { foreignKey: "routineId", as: "routine" });
RoutineDay.hasMany(RoutineSchedule, { foreignKey: { name: 'routineDayId', allowNull: false }, as: 'schedules', onDelete: 'CASCADE' });
RoutineSchedule.belongsTo(RoutineDay, { foreignKey: 'routineDayId', as: 'routineDay' });
RoutineDay.hasMany(RoutineExercise, { foreignKey: { name: "routineDayId", allowNull: false }, as: "exercises", onDelete: "CASCADE" });
RoutineExercise.belongsTo(RoutineDay, { foreignKey: "routineDayId", as: "routineDay" });
Exercise.hasMany(RoutineExercise, { foreignKey: { name: "exerciseId", allowNull: false }, as: "routineItems" });
RoutineExercise.belongsTo(Exercise, { foreignKey: "exerciseId", as: "exercise" });

RoutineDay.hasMany(TrainingSession, { foreignKey: { name: "routineDayId", allowNull: true }, as: "sessions" });
TrainingSession.belongsTo(RoutineDay, { foreignKey: "routineDayId", as: "routineDay" });
TrainingSession.hasMany(PerformedExercise, { foreignKey: { name: "sessionId", allowNull: false }, as: "exercises", onDelete: "CASCADE" });
PerformedExercise.belongsTo(TrainingSession, { foreignKey: "sessionId", as: "session" });
Exercise.hasMany(PerformedExercise, { foreignKey: { name: "exerciseId", allowNull: false }, as: "performed" });
PerformedExercise.belongsTo(Exercise, { foreignKey: "exerciseId", as: "exercise" });
PerformedExercise.hasMany(PerformedSet, { foreignKey: { name: "performedExerciseId", allowNull: false }, as: "sets", onDelete: "CASCADE" });
PerformedSet.belongsTo(PerformedExercise, { foreignKey: "performedExerciseId", as: "performedExercise" });
Exercise.hasMany(StrengthRecord, { foreignKey: { name: "exerciseId", allowNull: false }, as: "records" });
StrengthRecord.belongsTo(Exercise, { foreignKey: "exerciseId", as: "exercise" });

export const models = {
  User, Exercise, Routine, RoutineDay, RoutineExercise, RoutineSchedule, TrainingSession,
  PerformedExercise, PerformedSet, BodyWeightHistory, StrengthRecord,
};
