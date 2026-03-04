import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class Signal extends Model {}

Signal.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		indicatorId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'indicator_id',
		},
		tickerId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'ticker_id',
		},
		date: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
	},
	{
		sequelize,
		modelName: 'Signal',
		tableName: 'signals',
		underscored: true,
	},
);

export default Signal;
