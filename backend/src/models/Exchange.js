import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class Exchange extends Model {}

Exchange.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		code: {
			type: DataTypes.STRING(20),
			allowNull: false,
			unique: true,
			comment: 'EODHD exchange code, e.g. US, LSE, TO',
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		operatingMic: {
			type: DataTypes.STRING(100),
			allowNull: true,
			field: 'operating_mic',
		},
		country: {
			type: DataTypes.STRING(100),
			allowNull: true,
		},
		countryIso2: {
			type: DataTypes.CHAR(2),
			allowNull: true,
			field: 'country_iso2',
		},
		countryIso3: {
			type: DataTypes.CHAR(3),
			allowNull: true,
			field: 'country_iso3',
		},
		currency: {
			type: DataTypes.CHAR(10),
			allowNull: true,
		},
		closeUtc: {
			type: DataTypes.STRING(5),
			allowNull: true,
			field: 'close_utc',
			comment: 'Market close time in UTC (HH:MM). Null for 24/7 or virtual markets',
		},
		closeUtcWinter: {
			type: DataTypes.STRING(5),
			allowNull: true,
			field: 'close_utc_winter',
			comment: 'Market close time in UTC during winter/standard time (HH:MM)',
		},
		closeUtcSummer: {
			type: DataTypes.STRING(5),
			allowNull: true,
			field: 'close_utc_summer',
			comment: 'Market close time in UTC during summer/daylight saving time (HH:MM)',
		},
		imported: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			comment: 'True once the top 100 tickers have been imported for this exchange',
		},
		lastDailyUpdateAt: {
			type: DataTypes.DATE,
			allowNull: true,
			field: 'last_daily_update_at',
		},
	},
	{
		sequelize,
		modelName: 'Exchange',
		tableName: 'exchanges',
		underscored: true,
	},
);

export default Exchange;
