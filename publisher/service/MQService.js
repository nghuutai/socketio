const amqp = require('amqplib')
const queue = process.env.QUEUE || 'hello'

async function publisher({ id, text }) {
    const connection = await amqp.connect('amqp://localhost')
    const channel = await connection.createChannel()

    await channel.assertQueue(queue)
    const message = {
        id,
        text
    }
    const sent = await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { priority: 1 });
    sent
        ? console.log(`Sent message to "${queue}" queue`, message)
        : console.log(`Fails sending message to "${queue}" queue`, message)
}

module.exports = publisher;