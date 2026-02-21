'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class Ticker extends Model {
	/**
	 * Returns the full EODHD symbol: SYMBOL.EXCHANGE_CODE
	 * e.g. AAPL.US
	 */
	get eodhSymbol() {
		return `${this.symbol}.${this.exchange?.code}`;
	}
}

Ticker.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		symbol: {
			type: DataTypes.STRING(50),
			allowNull: false,
			comment: 'Ticker symbol without exchange suffix, e.g. AAPL, MCD',
		},
		exchangeId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'exchange_id',
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		currency: {
			type: DataTypes.CHAR(10),
			allowNull: true,
		},
		isTracked: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'is_tracked',
		},
	},
	{
		sequelize,
		modelName: 'Ticker',
		tableName: 'tickers',
		underscored: true,
		indexes: [
			{ unique: true, fields: ['symbol', 'exchange_id'], name: 'tickers_symbol_exchange_unique' },
		],
	},
);

module.exports = Ticker;
