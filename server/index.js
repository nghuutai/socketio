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

app.use(cors());

let userConnected = [];
// store all task consum to rabbitmq
let tasks = [];
let mapId = new Map();

io.on('connection', async (socket) => { /* socket object may be used to send specific messages to the new connected client */
    console.log('new client connected');
    socket.on('userConnect', (id) => {
        userConnected.push({ id, status: 'ready' });
        mapId.set(socket.id, id);
        console.log('28', userConnected);
        // subscriber(socket).catch((error) => {
        //     console.error(error)
        //     process.exit(1)
        // })
        subscriber(socket, true, false);
    })

    socket.on('handle', async (user, result) => {
        const connection = await amqp.connect('amqp://localhost')
        const channel = await connection.createChannel();
        userConnected = changeStatusUser(userConnected, user);
        console.log('--------------ready-------------', userConnected);

        if (result.status === 'faile') {
            console.log(result.count);
            let priority = 50;
            const retryTask = {
                ...result,
                text: Math.floor(Math.random() * Math.floor(10)),
            }
            console.log('send retry assign task');
            await channel.sendToQueue(queue, new Buffer(JSON.stringify(retryTask)), { priority });
            subscriber(socket, false, true);
        } else {
            subscriber(socket, false, true);
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("Client disconnected", reason);
        userConnected = userConnected.filter(user => user.id !== mapId.get(socket.id));
        mapId.delete(socket.id);
        console.log('65', userConnected);
        console.info('disconnected user (id=' + socket.id + ').');

    });
});


http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

async function subscriber(socket, canConsume, canGet) {
    const connection = await amqp.connect('amqp://localhost')
    let channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });
    const queueInfo = await channel.checkQueue(queue);
    console.log(queueInfo);
    if (canConsume) {
        console.log('1111111111111111111')
        if (queueInfo.messageCount > 0) {
            console.log('2222222222222222222');
            const mess = await channel.get(queue, { noAck: false });

            if (checkAssign(userConnected, mapId.get(socket.id))) {
                console.log('3333333333333333');
                let content = JSON.parse(mess.content.toString());
                console.log(userConnected);
                console.log('324235');
                console.log(content);
                // tasks = tasks.filter(t => t.id !== content.id);
                socket.emit('assign', content, (res) => {
                    console.log(res);
                    userConnected = changeStatusUser(userConnected, res);
                    channel.ack(mess);
                    // console.log('---------processing--------------', userConnected)
                });
                
            }
        } else {
            channel.prefetch(1);
            await channel.consume(queue, (message) => {
                // if task failed, retry task the beginning of tasks
                // if (content.status === 'faile') {
                //     console.log('---------------retry------------', content.text);
                //     tasks.unshift(content);
                // } else {
                //     tasks.push(content);
                // }
                console.log(checkAssign(userConnected, mapId.get(socket.id)), 'hhhhhhhhhhhhh', mapId.get(socket.id), socket.id);
                console.log(mapId);
                if (checkAssign(userConnected, mapId.get(socket.id))) {
                    const content = JSON.parse(message.content.toString())
                    console.log(userConnected);
                    console.log('324235');
                    console.log(content);
                    // tasks = tasks.filter(t => t.id !== content.id);
                    socket.emit('assign', content, async (res) => {
                        if (!res) return;
                        console.log(res);
                        userConnected = await changeStatusUser(userConnected, res);
                        // console.log('---------processing--------------', userConnected)
                        channel.ack(message);
                    });
                }
                if (checkCloseChannel(userConnected)) {
                    console.log('closeeeeeeeeeeeeeeeeee');
                    channel.close();
                }
            }, {
                noAck: false,
            });
        }
    }
    if (canGet) {
        channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });
        const mess = await channel.get(queue, { noAck: false });


        if (checkAssign(userConnected, mapId.get(socket.id))) {
            let content = JSON.parse(mess.content.toString());
            console.log(userConnected);
            console.log('324235');
            console.log(content);
            // tasks = tasks.filter(t => t.id !== content.id);
            socket.emit('assign', content, (res) => {
                console.log(res);
                userConnected = changeStatusUser(userConnected, res);
                // console.log('---------processing--------------', userConnected)
            });
            channel.ack(mess);
        }
    }
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


// async function getTask(socket) {
//     // const connection = await amqp.connect('amqp://localhost')
//     // const channel1 = await connection.createChannel();
//     // const connection = await amqp.connect('amqp://localhost');
//     // const channel = await connection.createChannel();

//     // await channel.assertQueue(queue, { durable: true })
//     // channel.prefetch(1);
//     const mess = await channel.get(queue, { noAck: false });
//     console.log(mess);
//     // console.log(mess.content.toString());

//     if (checkAssign(userConnected, mapId.get(socket.id))) {
//         let content = JSON.parse(mess.content.toString());
//         console.log(userConnected);
//         console.log('324235');
//         console.log(content);
//         // tasks = tasks.filter(t => t.id !== content.id);
//         socket.emit('assign', content, (res) => {
//             console.log(res);
//             userConnected = changeStatusUser(userConnected, res);
//             // console.log('---------processing--------------', userConnected)
//         });
//         channel.ack(mess);
//     }
// }