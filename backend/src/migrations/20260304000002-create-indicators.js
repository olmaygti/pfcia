'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('indicators', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			name: {
				type: Sequelize.STRING(10),
				allowNull: false,
				unique: true,
			},
			description: {
				type: Sequelize.STRING(50),
				allowNull: true,
			},
		});

		await queryInterface.bulkInsert('indicators', [
			{ name: '50MM', description: 'Sell on close below 50d average' },
			{ name: 'YearlyMax', description: 'New maximum of the year' },
		]);
	},

	async down(queryInterface) {
		await queryInterface.dropTable('indicators');
	},
};
