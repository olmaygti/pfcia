const express = require('express');
const authRouter = require('./routes/auth');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

module.exports = app;
