import amqp from 'amqplib/callback_api.js'

const queues = ['EVENTS']
const EVENTS = ['STAT_CREATED']

export default class RabbitChannel {
	channel
	connection
	subscribers = []
	isProducer
	rabbitServer = process.env.RABBIT_SERVER || 'localhost'

	constructor(producer) {
		this.isProducer = producer
	}

	async initResources() {
		const self = this;
		return new Promise((resolve, reject) => {
			amqp.connect(`amqp://${self.rabbitServer}`, function(error0, connection) {
				error0 && reject(error0)
				self.connection = connection
				connection.createChannel(function(error1, channel) {
					error1 && reject(error1);
					self.channel = channel;
					queues.forEach(queue =>
						channel.assertQueue(queue, {
						  durable: false,
						  auto_delete: true,
						  autoAck: true
						})
					);
	
					if (!self.isProducer) {
						queues.forEach(queue => (
							channel.consume(queue, self.#consume.bind(self, queue), { autoAck: true })
						))
					}
					resolve(channel);
				});
			});
		});
	}

	async #consume(queue, msg) {
		const parsedMsg = JSON.parse(msg.content.toString());
		// await Promise.all(this.subscribers
		// 	.filter(sub =>  sub.queue === queue && sub.event === parsedMsg.event)
		// 	.filter(sub => sub.filter ? sub.filter(parsedMsg) : true)
		// 	.map(({ processor }) => processor.process(parsedMsg)))
		try {
			await Promise.all(this.subscribers
				.filter(sub =>  sub.queue === queue && sub.event === parsedMsg.event)
				.filter(sub => sub.filter ? sub.filter(parsedMsg) : true)
				.map(({ processor }) => processor.process(parsedMsg)))
		} catch(err) {
			console.error('Failed delivering messages with ', err)
		}

		return this.channel.ack(msg)
	}

	async send(event, msg, queue = 'EVENTS') {
		return this.channel.sendToQueue(queue, Buffer.from(JSON.stringify({ event, payload: msg})));
	}

	subscribe(event, subscriber, filter, queue = 'EVENTS') {
		this.subscribers.push({ queue, event, filter, processor: subscriber });
	}

	async cleanResources() {
		console.info('cleaning connection')
		this.connection.close();

	}
}
