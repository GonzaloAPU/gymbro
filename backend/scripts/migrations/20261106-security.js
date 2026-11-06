import {sequelize} from '../../src/db.js';
import {securitySchemaSql} from '../../src/services/security-schema.js';
export async function migrateSecurity(){await sequelize.transaction(transaction=>sequelize.query(securitySchemaSql(sequelize.options.define.schema||'public'),{transaction}));}
