'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('exchanges', 'last_daily_update_at', {
			type: Sequelize.DATE,
			allowNull: true,
		});
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('exchanges', 'last_daily_update_at');
	},
};
