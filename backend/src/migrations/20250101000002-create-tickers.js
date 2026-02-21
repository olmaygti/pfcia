'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('tickers', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			symbol: {
				type: Sequelize.STRING(50),
				allowNull: false,
				comment: 'Ticker symbol without exchange suffix, e.g. AAPL, MCD',
			},
			exchange_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'exchanges',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			name: {
				type: Sequelize.STRING(255),
				allowNull: true,
				comment: 'Company or instrument full name',
			},
			currency: {
				type: Sequelize.CHAR(10),
				allowNull: true,
				comment: 'Trading currency for this ticker (may differ from exchange default)',
			},
			is_tracked: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
				comment: 'Whether this ticker is actively imported and updated',
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

		await queryInterface.addIndex('tickers', ['symbol', 'exchange_id'], {
			unique: true,
			name: 'tickers_symbol_exchange_unique',
		});

		await queryInterface.addIndex('tickers', ['is_tracked'], {
			name: 'tickers_is_tracked_idx',
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable('tickers');
	},
};
