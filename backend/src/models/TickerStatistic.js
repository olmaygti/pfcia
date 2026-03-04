import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class TickerStatistic extends Model {}

TickerStatistic.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		tickerId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'ticker_id',
		},
		date: {
			type: DataTypes.DATEONLY,
			allowNull: false,
			comment: 'Date the statistic applies to (YYYY-MM-DD)',
		},
		name: {
			type: DataTypes.STRING(100),
			allowNull: false,
			comment: 'Statistic identifier, e.g. sma_50, sma_200',
		},
		value: {
			type: DataTypes.DECIMAL(20, 8),
			allowNull: false,
			comment: 'Computed statistic value',
		},
	},
	{
		sequelize,
		modelName: 'TickerStatistic',
		tableName: 'ticker_statistics',
		underscored: true,
		indexes: [
			{
				unique: true,
				fields: ['ticker_id', 'date', 'name'],
				name: 'ticker_statistics_ticker_date_name_unique',
			},
			{
				fields: ['ticker_id', 'name', 'date'],
				name: 'ticker_statistics_ticker_name_date_idx',
			},
		],
	},
);

export default TickerStatistic;
