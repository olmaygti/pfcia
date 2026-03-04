import sequelize from '../db.js';
import Exchange from './Exchange.js';
import Ticker from './Ticker.js';
import EodPrice from './EodPrice.js';
import TickerStatistic from './TickerStatistic.js';
import User from './User.js';

// Associations
Exchange.hasMany(Ticker, { foreignKey: 'exchange_id', as: 'tickers' });
Ticker.belongsTo(Exchange, { foreignKey: 'exchange_id', as: 'exchange' });

Ticker.hasMany(EodPrice, { foreignKey: 'ticker_id', as: 'eodPrices' });
EodPrice.belongsTo(Ticker, { foreignKey: 'ticker_id', as: 'ticker' });

Ticker.hasMany(TickerStatistic, { foreignKey: 'ticker_id', as: 'statistics' });
TickerStatistic.belongsTo(Ticker, { foreignKey: 'ticker_id', as: 'ticker' });

export { sequelize, Exchange, Ticker, EodPrice, TickerStatistic, User };
