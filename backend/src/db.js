/**
 * Crea la conexión compartida de Sequelize con PostgreSQL. DATABASE_URL indica servidor, puerto y credenciales; underscored traduce nombres como userId a columnas user_id.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import "dotenv/config";
import { Sequelize } from "sequelize";
import {databaseOptions,cloudSqlHook} from './database-options.js';

const settings=databaseOptions(process.env);
export const sequelize=settings.url
  ? new Sequelize(settings.url,settings.options)
  : new Sequelize(settings.database,settings.user,undefined,settings.options);
let connector;
if(settings.connector){
  const {Connector}=await import('@google-cloud/cloud-sql-connector');
  connector=new Connector();
  sequelize.addHook('beforeConnect',cloudSqlHook(connector,settings.connector));
}
/** Libera también la renovación de certificados del conector al apagar el servidor. */
export async function closeDatabase(){try{await sequelize.close();}finally{connector?.close();}}
