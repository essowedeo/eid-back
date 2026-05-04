import { Sequelize, DataTypes } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Connect to Postgres if DATABASE_URL is set, otherwise fallback to local SQLite
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      },
      logging: false
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: join(__dirname, 'data', 'database.sqlite'),
      logging: false
    });

export const Team = sequelize.define('Team', {
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
  captainName: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  secretCode: { type: DataTypes.STRING, allowNull: false },
  paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  phone: { type: DataTypes.STRING }
});

export const Player = sequelize.define('Player', {
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'confirmed' },
  isCaptain: { type: DataTypes.BOOLEAN, defaultValue: false }
});

Team.hasMany(Player, { foreignKey: 'teamId', onDelete: 'CASCADE' });
Player.belongsTo(Team, { foreignKey: 'teamId' });

export const Concours = sequelize.define('Concours', {
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  paid: { type: DataTypes.BOOLEAN, defaultValue: false }
});

export async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connexion à la base de données établie.');
    // Crée ou modifie les tables sans détruire les données existantes
    await sequelize.sync({ alter: true });
    console.log('[DB] Tables synchronisées.');
  } catch (error) {
    console.error('[DB] Impossible de se connecter :', error);
  }
}
