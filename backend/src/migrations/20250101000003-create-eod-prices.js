'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('eod_prices', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			ticker_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'tickers',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
				comment: 'Trading date (YYYY-MM-DD)',
			},
			open: {
				type: Sequelize.DECIMAL(15, 4),
				allowNull: true,
				comment: 'Opening price, raw (not adjusted)',
			},
			high: {
				type: Sequelize.DECIMAL(15, 4),
				allowNull: true,
				comment: 'Daily high price, raw (not adjusted)',
			},
			low: {
				type: Sequelize.DECIMAL(15, 4),
				allowNull: true,
				comment: 'Daily low price, raw (not adjusted)',
			},
			close: {
				type: Sequelize.DECIMAL(15, 4),
				allowNull: true,
				comment: 'Closing price, raw (not adjusted)',
			},
			adjusted_close: {
				type: Sequelize.DECIMAL(15, 4),
				allowNull: true,
				comment: 'Close adjusted for splits and dividends',
			},
			volume: {
				type: Sequelize.BIGINT,
				allowNull: true,
				comment: 'Trading volume, adjusted for splits',
			},
			created_at: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			updated_at: {
				type: Sequelize.DATE,
				allowNull: false,
			},
		});

		await queryInterface.addIndex('eod_prices', ['ticker_id', 'date'], {
			unique: true,
			name: 'eod_prices_ticker_date_unique',
		});

		await queryInterface.addIndex('eod_prices', ['date'], {
			name: 'eod_prices_date_idx',
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable('eod_prices');
	},
};
