import "dotenv/config";
import bcrypt from "bcryptjs";
import { sequelize } from "../src/db.js";
import { Exercise, Routine, RoutineDay, RoutineExercise, User } from "../src/models/index.js";

const exerciseData = [
  { name: "Sentadilla", muscleGroup: "Piernas", equipment: "Barra", movementPattern: "Sentadilla", trainingType: "POWER" },
  { name: "Press banca", muscleGroup: "Pecho", equipment: "Barra", movementPattern: "Empuje horizontal", trainingType: "POWER" },
  { name: "Peso muerto rumano", muscleGroup: "Isquiotibiales", equipment: "Barra", movementPattern: "Bisagra de cadera", trainingType: "POWER" },
  { name: "Remo sentado", muscleGroup: "Espalda", equipment: "Polea", movementPattern: "Traccion horizontal", trainingType: "POWER" },
  { name: "Press militar", muscleGroup: "Hombros", equipment: "Mancuernas", movementPattern: "Empuje vertical", trainingType: "POWER" },
  { name: "Dominadas", muscleGroup: "Espalda", equipment: "Barra fija", movementPattern: "Traccion vertical", trainingType: "POWER" },
  { name: "Hip thrust", muscleGroup: "Gluteos", equipment: "Barra", movementPattern: "Extension de cadera", trainingType: "POWER" },
  { name: "Curl de biceps", muscleGroup: "Brazos", equipment: "Mancuernas", movementPattern: "Flexion de codo", trainingType: "POWER" },
  { name: "Correr", muscleGroup: "Cardio", equipment: "Cinta o exterior", movementPattern: "Carrera continua", trainingType: "AEROBIC" },
  { name: "Bicicleta", muscleGroup: "Cardio", equipment: "Bicicleta", movementPattern: "Pedaleo continuo", trainingType: "AEROBIC" },
  { name: "Caminata inclinada", muscleGroup: "Cardio", equipment: "Cinta", movementPattern: "Marcha", trainingType: "AEROBIC" },
  { name: "Eliptica", muscleGroup: "Cardio", equipment: "Eliptica", movementPattern: "Cardio continuo", trainingType: "AEROBIC" },
  { name: "Remo continuo", muscleGroup: "Cuerpo completo", equipment: "Remo ergometro", movementPattern: "Cardio continuo", trainingType: "AEROBIC" },
  { name: "Sprints", muscleGroup: "Piernas", equipment: "Pista o cinta", movementPattern: "Carrera por intervalos", trainingType: "ANAEROBIC" },
  { name: "Bicicleta por intervalos", muscleGroup: "Piernas", equipment: "Bicicleta", movementPattern: "Pedaleo por intervalos", trainingType: "ANAEROBIC" },
  { name: "Burpees", muscleGroup: "Cuerpo completo", equipment: "Peso corporal", movementPattern: "Acondicionamiento", trainingType: "ANAEROBIC" },
  { name: "Kettlebell swing", muscleGroup: "Cuerpo completo", equipment: "Kettlebell", movementPattern: "Bisagra explosiva", trainingType: "ANAEROBIC" },
  { name: "Saltar cuerda", muscleGroup: "Cardio", equipment: "Cuerda", movementPattern: "Saltos por intervalos", trainingType: "ANAEROBIC" },
];

try {
  await sequelize.authenticate();
  const catalog = [];
  for (const data of exerciseData) {
    const [exercise] = await Exercise.findOrCreate({ where: { name: data.name }, defaults: data });
    await exercise.update(data);
    catalog.push(exercise);
  }

  const [user] = await User.findOrCreate({
    where: { email: "demo@smartgymbro.app" },
    defaults: {
      passwordHash: await bcrypt.hash("Demo1234!", 12), name: "Alex",
      goal: "Ganar fuerza y masa muscular", heightCm: 178, currentKg: 78.4,
      gymName: "Smart Gym Centro",
    },
  });

  const existingRoutine = await Routine.findOne({ where: { userId: user.id } });
  if (!existingRoutine) {
    const routine = await Routine.create({ userId: user.id, name: "Fuerza base", goal: "Progresion de cargas" });
    const day = await RoutineDay.create({ routineId: routine.id, name: "Torso + pierna", dayNumber: 1 });
    await RoutineExercise.bulkCreate(catalog.slice(0, 4).map((exercise, index) => ({
      routineDayId: day.id, exerciseId: exercise.id, order: index + 1,
      targetSets: index === 0 ? 4 : 3, minReps: index < 2 ? 5 : 8,
      maxReps: index < 2 ? 8 : 12, restSeconds: index < 2 ? 120 : 90,
    })));
  }
  console.log("Datos demo cargados con Sequelize.");
} finally {
  await sequelize.close();
}
