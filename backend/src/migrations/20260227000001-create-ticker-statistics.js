'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('ticker_statistics', {
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
				comment: 'Date the statistic applies to (YYYY-MM-DD)',
			},
			name: {
				type: Sequelize.STRING(100),
				allowNull: false,
				comment: 'Statistic identifier, e.g. sma_50, sma_200',
			},
			value: {
				type: Sequelize.DECIMAL(20, 8),
				allowNull: false,
				comment: 'Computed statistic value',
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

		await queryInterface.addIndex('ticker_statistics', ['ticker_id', 'date', 'name'], {
			unique: true,
			name: 'ticker_statistics_ticker_date_name_unique',
		});

		await queryInterface.addIndex('ticker_statistics', ['ticker_id', 'name', 'date'], {
			name: 'ticker_statistics_ticker_name_date_idx',
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable('ticker_statistics');
	},
};
