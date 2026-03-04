import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class Indicator extends Model {}

Indicator.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING(10),
			allowNull: false,
			unique: true,
		},
		description: {
			type: DataTypes.STRING(50),
			allowNull: true,
		},
	},
	{
		sequelize,
		modelName: 'Indicator',
		tableName: 'indicators',
		timestamps: false,
	},
);

export default Indicator;
