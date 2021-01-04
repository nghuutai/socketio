const cors = require('cors');
const amqp = require('amqplib')
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = 8080;
const queue = process.env.QUEUE || 'hello';
// const STATIC_CHANNELS = ['global_notifications', 'global_chat'];
app.use(cors());

let userConnected = [];


io.on('connection', (socket) => { /* socket object may be used to send specific messages to the new connected client */
    console.log('new client connected');
    userConnected.push({ id: socket.id, status: 'ready' });

    socket.on('connected', (data) => {
        console.log(data, '---------connected--------------');
        userConnected = userConnected.map(user => {
            if (user.id === data.id) {
                user.status = data.status;
                return user;
            }
            return user;
        });
    })
    console.log('--------User connected-----------------', userConnected);

    subscriber(socket).catch((error) => {
        console.error(error)
        process.exit(1)
    })

    socket.on("disconnect", (data) => {
        userConnected = userConnected.filter(user => user.id != socket.id);
        console.log(userConnected);
        console.log("Client disconnected");
    });
});


http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

async function subscriber(socket) {
    const connection = await amqp.connect('amqp://localhost')
    const channel = await connection.createChannel()

    await channel.assertQueue(queue)

    channel.consume(queue, (message) => {
        const content = JSON.parse(message.content.toString())

        if (checkAssign(userConnected, socket.id)) {
            socket.emit('assign', content, (res) => {
                console.log(res);
                if (res.status === 'faile') {
                    let priority = res.count + 1;
                    res = {
                        ...res,
                        text: Math.floor(Math.random() * Math.floor(10)),
                    }
                    console.log('send retry assign task');
                    channel.sendToQueue(queue, new Buffer(JSON.stringify(res)), { priority });
                }
            });
            // socket.emit('assign', content)
        }
        // io.to(userConnected[0]).emit('assign', content);
        channel.ack(message)
    })
}

const checkAssign = (userConnected, id) => {
    return userConnected.filter(user => user.id === id && user.status === 'ready').length > 0;
}