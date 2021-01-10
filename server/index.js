const cors = require('cors');
const amqp = require('amqplib');
const { query } = require('express');
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

app.use(cors());

// store CS info connected
let userConnected = [];
let mapId = new Map();

io.on('connection', async (socket) => { /* socket object may be used to send specific messages to the new connected client */
    console.log('new client connected');
    socket.on('userConnect', (id, socketId) => {
        // add CS info when CS connected
        userConnected.push({ id, status: 'ready', socketId });
        mapId.set(socket.id, id);
        console.log('28', userConnected);
        // assign task for CS available
        subscriber();
    })

    socket.on('handle', async (user, result) => {
        const connection = await amqp.connect('amqp://localhost')
        const channel = await connection.createChannel();
        console.log(user);
        userConnected = await changeStatusUser(userConnected, user);
        console.log(user.id);
        console.log('--------------ready-------------', userConnected);

        if (result.status === 'faile') {
            await channel.consume(queue, async (message) => {
                console.log('243rt224t42t24t42t')
                console.log(checkAssign(userConnected, mapId.get(randomId(userConnected))), 'hhhhhhhhhhhhh', randomId(userConnected));
                console.log(mapId);
                const socId = randomId(userConnected);
                const n = await channel.checkQueue(queue);
                console.log('sawweqe', n);
                if (checkAssign(userConnected, mapId.get(socId))) {
                    const content = JSON.parse(message.content.toString())
                    console.log('1', mapId);
                    console.log('2', content);
                    io.to(socId).emit('assign', content);
                    userConnected = await changeStatusUser(userConnected, { id: socId, status: 'inprocess' });
                    channel.ack(message);
                    await channel.close();
                    console.log( '4',userConnected);
                }
            }, {
                noAck: false,
                consumerTag: 'consumer1'
            });

            let priority = result.count + 1;
            const dataRetry = {
                ...result,
                text: Math.floor(Math.random() * Math.floor(10)),
            }
            console.log('send retry assign task');
            await channel.sendToQueue(queue, Buffer.from(JSON.stringify(dataRetry)), { priority });
        }
        if (result.status === 'oke') {
            subscriber(flag);
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("Client disconnected", reason);
        // delete CS info disconnected
        userConnected = userConnected.filter(user => user.id !== mapId.get(socket.id));
        mapId.delete(socket.id);
        console.log('65', userConnected);
        console.log('61', mapId);
        console.info('disconnected user (id=' + socket.id + ').');

    });
});


http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`); 
});

async function subscriber() {
    const connection = await amqp.connect('amqp://localhost')
    let channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });
    const queueInfo = await channel.checkQueue(queue);
    console.log('Infoooooo', queueInfo);
    //  if queue haven't message then use channel.consume else use channel.get
    if (queueInfo.messageCount <= 0) {
        await channel.consume(queue, async (message) => {
            console.log('243rt224t42t24t42t')
            console.log(checkAssign(userConnected, mapId.get(randomId(userConnected))), 'hhhhhhhhhhhhh', randomId(userConnected));
            console.log(mapId);
            const socId = randomId(userConnected);
            const n = await channel.checkQueue(queue);
            console.log('sawweqe', n);
            if (checkAssign(userConnected, mapId.get(socId))) {
                const content = JSON.parse(message.content.toString())
                console.log('1', mapId);
                console.log('2', content);
                io.to(socId).emit('assign', content);
                userConnected = await changeStatusUser(userConnected, { id: socId, status: 'inprocess' });
                channel.ack(message);
                await channel.close();
                console.log( '4',userConnected);
            }
        }, {
            noAck: false,
            consumerTag: 'consumer1'
        });
    }
    if (queueInfo.messageCount > 0) {
        console.log('getttttttttt');
        const mess = await channel.get(queue, { noAck: false });
        const socId = randomId(userConnected);
        if (checkAssign(userConnected, mapId.get(socId))) {
            const content = JSON.parse(mess.content.toString())
            console.log('1', mapId);
            console.log('2', content);
            io.to(socId).emit('assign', content);
            userConnected = await changeStatusUser(userConnected, { id: socId, status: 'inprocess' });
            channel.ack(mess);
            if (checkCloseChannel(userConnected)) {
                console.log('closeeeeeeeeeeeeeeeeee');
                await channel.close();
            }
            console.log( '4',userConnected);
        }
    }
}

// generator socketId of CS available to assign task
const randomId = (userConnected) => {
    userReady = userConnected.filter(user => user.status === 'ready');
    if (userReady.length <= 0) return false;
    const random = Math.floor(Math.random() * Math.floor(userReady.length));
    return userReady[random].socketId;
}

const checkAssign = (userConnected, id) => {
    return userConnected.filter(user => (user.status === 'ready' && user.id === id)).length > 0;
}

const checkCloseChannel = (userConnected) => {
    return userConnected.filter(user => (user.status === 'ready')).length <= 0;
}

const changeStatusUser = (userConnected, data) => {
    return userConnected.map(user => {
        if (user.id === mapId.get(data.id)) {
            // user.status = data.status;
            user = {
                ...user,
                status: data.status,
            };
            return user;
        }
        return user;
    });
}
