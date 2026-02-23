const express = require('express');
const authRouter = require('./routes/auth');
const exchangesRouter = require('./routes/exchanges');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/exchanges', exchangesRouter);

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

module.exports = app;
