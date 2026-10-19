import "dotenv/config";
import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";
import { Exercise, RoutineExercise, RoutineDay, RoutineSchedule, User } from "../src/models/index.js";

async function addColumnIfMissing(model, field, definition) {
  const queryInterface = sequelize.getQueryInterface();
  const table = model.getTableName();
  const columns = await queryInterface.describeTable(table);
  if (!columns[field]) await queryInterface.addColumn(table, field, definition);
}

try {
  await sequelize.authenticate();
  await sequelize.sync();
  await addColumnIfMissing(RoutineDay, "schedule", { type: DataTypes.JSON, allowNull: false, defaultValue: [] });
  await addColumnIfMissing(RoutineDay, "favorite", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await sequelize.transaction(async transaction => {
    const days = await RoutineDay.findAll({ transaction });
    for (const day of days) {
      if (!day.schedule?.length) continue;
      if (!await RoutineSchedule.count({ where: { routineDayId: day.id }, transaction })) {
        await RoutineSchedule.bulkCreate(day.schedule.map(slot => ({ routineDayId: day.id, weekday: slot.weekday, start: slot.start, end: slot.end })), { transaction });
      }
      await day.update({ schedule: [] }, { transaction });
    }
  });
  await addColumnIfMissing(User, "photo_url", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(User, "discipline", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(User, "rest_days", { type: DataTypes.JSON, allowNull: false, defaultValue: [] });
  await addColumnIfMissing(Exercise, "training_type", { type: DataTypes.STRING, allowNull: false, defaultValue: "POWER" });
  await addColumnIfMissing(RoutineExercise, "target_duration_minutes", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(RoutineExercise, "target_distance_km", { type: DataTypes.DECIMAL(7, 2), allowNull: true });
  await addColumnIfMissing(RoutineExercise, "intensity", { type: DataTypes.STRING, allowNull: true });
  console.log("Base de datos sincronizada con Sequelize.");
} finally {
  await sequelize.close();
}
