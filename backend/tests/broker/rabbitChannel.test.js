jest.mock('amqplib/callback_api.js');

import amqp from 'amqplib/callback_api.js';
import RabbitChannel from '../../src/broker/rabbitChannel.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMessage(event, payload) {
	return { content: Buffer.from(JSON.stringify({ event, payload })) };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('RabbitChannel', () => {
	let mockChannel, mockConnection;

	beforeEach(() => {
		jest.clearAllMocks();

		mockChannel = {
			assertQueue: jest.fn(),
			consume: jest.fn(),
			sendToQueue: jest.fn(),
			ack: jest.fn(),
		};

		mockConnection = {
			createChannel: jest.fn((cb) => cb(null, mockChannel)),
			close: jest.fn(),
		};

		amqp.connect.mockImplementation((url, cb) => cb(null, mockConnection));
	});

	// ---------------------------------------------------------------------------
	// initResources
	// ---------------------------------------------------------------------------
	describe('initResources', () => {
		it('connects to localhost by default', async () => {
			await new RabbitChannel(true).initResources();

			expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost', expect.any(Function));
		});

		it('uses RABBIT_SERVER env var when set', async () => {
			process.env.RABBIT_SERVER = 'my-rabbit-host';
			const rc = new RabbitChannel(true);
			delete process.env.RABBIT_SERVER;

			await rc.initResources();

			expect(amqp.connect).toHaveBeenCalledWith('amqp://my-rabbit-host', expect.any(Function));
		});

		it('asserts all queues on the channel', async () => {
			await new RabbitChannel(true).initResources();

			expect(mockChannel.assertQueue).toHaveBeenCalledWith('EVENTS', expect.any(Object));
		});

		it('does not start consuming when instantiated as producer', async () => {
			await new RabbitChannel(true).initResources();

			expect(mockChannel.consume).not.toHaveBeenCalled();
		});

		it('starts consuming all queues when instantiated as consumer', async () => {
			await new RabbitChannel(false).initResources();

			expect(mockChannel.consume).toHaveBeenCalledWith(
				'EVENTS',
				expect.any(Function),
				{ autoAck: true },
			);
		});

		it('rejects when the connection fails', async () => {
			amqp.connect.mockImplementation((url, cb) => cb(new Error('Connection refused')));

			await expect(new RabbitChannel(true).initResources()).rejects.toThrow('Connection refused');
		});

		it('rejects when channel creation fails', async () => {
			mockConnection.createChannel.mockImplementation((cb) => cb(new Error('Channel error')));

			await expect(new RabbitChannel(true).initResources()).rejects.toThrow('Channel error');
		});
	});

	// ---------------------------------------------------------------------------
	// send
	// ---------------------------------------------------------------------------
	describe('send', () => {
		it('sends event and payload as JSON to the default EVENTS queue', async () => {
			const rc = new RabbitChannel(true);
			await rc.initResources();

			rc.send('MY_EVENT', { foo: 'bar' });

			expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
				'EVENTS',
				Buffer.from(JSON.stringify({ event: 'MY_EVENT', payload: { foo: 'bar' } })),
			);
		});

		it('sends to a custom queue when specified', async () => {
			const rc = new RabbitChannel(true);
			await rc.initResources();

			rc.send('MY_EVENT', {}, 'CUSTOM_QUEUE');

			expect(mockChannel.sendToQueue).toHaveBeenCalledWith('CUSTOM_QUEUE', expect.any(Buffer));
		});
	});

	// ---------------------------------------------------------------------------
	// subscribe
	// ---------------------------------------------------------------------------
	describe('subscribe', () => {
		it('registers a subscriber for the given event on the default queue', () => {
			const rc = new RabbitChannel(false);
			const processor = { process: jest.fn() };

			rc.subscribe('MY_EVENT', processor);

			expect(rc.subscribers).toHaveLength(1);
			expect(rc.subscribers[0]).toMatchObject({ queue: 'EVENTS', event: 'MY_EVENT', processor });
		});

		it('stores an optional filter function', () => {
			const rc = new RabbitChannel(false);
			const filter = jest.fn();

			rc.subscribe('MY_EVENT', { process: jest.fn() }, filter);

			expect(rc.subscribers[0].filter).toBe(filter);
		});

		it('allows subscribing to a custom queue', () => {
			const rc = new RabbitChannel(false);

			rc.subscribe('MY_EVENT', { process: jest.fn() }, null, 'CUSTOM_QUEUE');

			expect(rc.subscribers[0].queue).toBe('CUSTOM_QUEUE');
		});
	});

	// ---------------------------------------------------------------------------
	// message consumption
	// ---------------------------------------------------------------------------
	describe('message consumption', () => {
		async function getConsumeCallback(rc) {
			await rc.initResources();
			return mockChannel.consume.mock.calls[0][1];
		}

		it('routes a message to the matching subscriber', async () => {
			const rc = new RabbitChannel(false);
			const processor = { process: jest.fn().mockResolvedValue(undefined) };
			rc.subscribe('MY_EVENT', processor);

			const consume = await getConsumeCallback(rc);
			await consume(makeMessage('MY_EVENT', { x: 1 }));

			expect(processor.process).toHaveBeenCalledWith({ event: 'MY_EVENT', payload: { x: 1 } });
		});

		it('does not route when the event does not match', async () => {
			const rc = new RabbitChannel(false);
			const processor = { process: jest.fn() };
			rc.subscribe('OTHER_EVENT', processor);

			const consume = await getConsumeCallback(rc);
			await consume(makeMessage('MY_EVENT', {}));

			expect(processor.process).not.toHaveBeenCalled();
		});

		it('skips the subscriber when the filter returns false', async () => {
			const rc = new RabbitChannel(false);
			const processor = { process: jest.fn() };
			rc.subscribe('MY_EVENT', processor, () => false);

			const consume = await getConsumeCallback(rc);
			await consume(makeMessage('MY_EVENT', {}));

			expect(processor.process).not.toHaveBeenCalled();
		});

		it('delivers when the filter returns true', async () => {
			const rc = new RabbitChannel(false);
			const processor = { process: jest.fn().mockResolvedValue(undefined) };
			rc.subscribe('MY_EVENT', processor, () => true);

			const consume = await getConsumeCallback(rc);
			await consume(makeMessage('MY_EVENT', {}));

			expect(processor.process).toHaveBeenCalled();
		});

		it('does not throw when a processor rejects', async () => {
			const rc = new RabbitChannel(false);
			const processor = { process: jest.fn().mockRejectedValue(new Error('boom')) };
			rc.subscribe('MY_EVENT', processor);

			const consume = await getConsumeCallback(rc);

			await expect(consume(makeMessage('MY_EVENT', {}))).resolves.not.toThrow();
		});

		it('routes to multiple subscribers for the same event', async () => {
			const rc = new RabbitChannel(false);
			const p1 = { process: jest.fn().mockResolvedValue(undefined) };
			const p2 = { process: jest.fn().mockResolvedValue(undefined) };
			rc.subscribe('MY_EVENT', p1);
			rc.subscribe('MY_EVENT', p2);

			const consume = await getConsumeCallback(rc);
			await consume(makeMessage('MY_EVENT', {}));

			expect(p1.process).toHaveBeenCalled();
			expect(p2.process).toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// cleanResources
	// ---------------------------------------------------------------------------
	describe('cleanResources', () => {
		it('closes the RabbitMQ connection', async () => {
			const rc = new RabbitChannel(true);
			await rc.initResources();

			await rc.cleanResources();

			expect(mockConnection.close).toHaveBeenCalled();
		});
	});
});
