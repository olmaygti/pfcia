'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('users', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			google_id: {
				type: Sequelize.STRING(255),
				allowNull: false,
				unique: true,
			},
			email: {
				type: Sequelize.STRING(255),
				allowNull: false,
				unique: true,
			},
			phone_number: {
				type: Sequelize.STRING(20),
				allowNull: true,
			},
			role: {
				type: Sequelize.ENUM('USER', 'ADMIN'),
				allowNull: false,
				defaultValue: 'USER',
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
	},

	async down(queryInterface) {
		await queryInterface.dropTable('users');
		await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role"');
	},
};
