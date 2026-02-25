import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class User extends Model {}

User.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		googleId: {
			type: DataTypes.STRING(255),
			allowNull: false,
			unique: true,
			field: 'google_id',
		},
		email: {
			type: DataTypes.STRING(255),
			allowNull: false,
			unique: true,
		},
		phoneNumber: {
			type: DataTypes.STRING(20),
			allowNull: true,
			field: 'phone_number',
		},
		role: {
			type: DataTypes.ENUM('USER', 'ADMIN'),
			allowNull: false,
			defaultValue: 'USER',
		},
	},
	{
		sequelize,
		modelName: 'User',
		tableName: 'users',
		underscored: true,
	},
);

export default User;
