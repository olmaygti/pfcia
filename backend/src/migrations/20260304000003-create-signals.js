'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('signals', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			indicator_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'indicators', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			ticker_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'tickers', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
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

		await queryInterface.addIndex('signals', ['indicator_id', 'ticker_id', 'date'], {
			unique: true,
			name: 'signals_indicator_ticker_date_unique',
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable('signals');
	},
};
