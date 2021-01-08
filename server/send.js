const amqp = require('amqplib')
const queue = process.env.QUEUE || 'hello'

const messagesAmount = 4
const wait = 3000

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function sleepLoop(number, cb) {
    while (number--) {
        await sleep(wait)
        cb()
    }
}

async function exitAfterSend() {
    await sleep(messagesAmount * wait * 1.2)

    process.exit(0)
}

async function publisher() {
    const connection = await amqp.connect('amqp://localhost')
    const channel = await connection.createChannel()

    await channel.assertQueue(queue)

    sleepLoop(messagesAmount, async () => {
        const message = {
            id: Math.random().toString(32).slice(2, 6),
            text: Math.floor(Math.random() * Math.floor(10))
        }

        const sent = await channel.sendToQueue(queue, new Buffer(JSON.stringify(message)), { priority: 1 });

        sent
            ? console.log(`Sent message to "${queue}" queue`, message)
            : console.log(`Fails sending message to "${queue}" queue`, message)
    })
}

publisher().catch((error) => {
    console.error(error)
    process.exit(1)
})

exitAfterSend()