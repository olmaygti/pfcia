'use strict';

const sequelize = require('../db');
const Exchange = require('./Exchange');
const Ticker = require('./Ticker');
const EodPrice = require('./EodPrice');
const User = require('./User');

// Associations
Exchange.hasMany(Ticker, { foreignKey: 'exchange_id', as: 'tickers' });
Ticker.belongsTo(Exchange, { foreignKey: 'exchange_id', as: 'exchange' });

Ticker.hasMany(EodPrice, { foreignKey: 'ticker_id', as: 'eodPrices' });
EodPrice.belongsTo(Ticker, { foreignKey: 'ticker_id', as: 'ticker' });

module.exports = { sequelize, Exchange, Ticker, EodPrice, User };
