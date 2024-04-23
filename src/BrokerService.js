import pkg from 'amqplib';

const url = process.env.MESSAGE_BROKER_URL;
const addOnConnect = [];
const queues = [];
let ch, conn;

const addListener = (queueName, callback) => {
    if (queues.includes(queueName)) {
        throw new Error(`Queue ${queueName} is already being listened to.`);
    }
    if (!conn || !ch) {
        addOnConnect.push({ queueName, callback });
        return;
    }

    queues.push(queueName);
    ch.assertQueue(queueName, { durable: false });
    ch.consume(queueName, (msg) => {
        const text = msg.content.toString();
        const json = JSON.parse(text);
        callback(json);
    }, { noAck: true });
};

const removeListener = (queueName) => {
    ch.cancel(queueName);
};

const sendMessage = (queueName, msg) => {
    const text = JSON.stringify(msg);

    ch.assertQueue(queueName, { durable: false });
    ch.sendToQueue(queueName, Buffer.from(text));
};

const connect = async () => {
    conn = await pkg.connect(url);
    ch = await conn.createChannel();

    for (const conf of addOnConnect) {
        addListener(conf.queueName, conf.callback);
    }
}

export default {
    connect,
    addListener,
    removeListener,
    sendMessage,
}

