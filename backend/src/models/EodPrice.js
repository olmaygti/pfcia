import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class EodPrice extends Model {}

EodPrice.init(
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
			comment: 'Trading date (YYYY-MM-DD)',
		},
		open: {
			type: DataTypes.DECIMAL(15, 4),
			allowNull: true,
			comment: 'Opening price, raw (not adjusted)',
		},
		high: {
			type: DataTypes.DECIMAL(15, 4),
			allowNull: true,
			comment: 'Daily high price, raw (not adjusted)',
		},
		low: {
			type: DataTypes.DECIMAL(15, 4),
			allowNull: true,
			comment: 'Daily low price, raw (not adjusted)',
		},
		close: {
			type: DataTypes.DECIMAL(15, 4),
			allowNull: true,
			comment: 'Closing price, raw (not adjusted)',
		},
		adjustedClose: {
			type: DataTypes.DECIMAL(15, 4),
			allowNull: true,
			field: 'adjusted_close',
			comment: 'Close adjusted for splits and dividends',
		},
		volume: {
			type: DataTypes.BIGINT,
			allowNull: true,
			comment: 'Trading volume, adjusted for splits',
		},
	},
	{
		sequelize,
		modelName: 'EodPrice',
		tableName: 'eod_prices',
		underscored: true,
		indexes: [
			{ unique: true, fields: ['ticker_id', 'date'], name: 'eod_prices_ticker_date_unique' },
			{ fields: ['date'], name: 'eod_prices_date_idx' },
		],
	},
);

export default EodPrice;
