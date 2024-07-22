import pkg from 'amqplib';

/**
 * @description The URL of the message broker
 * @type {string}
 */
const url = process.env.MESSAGE_BROKER_URL;

/**
 * @description Callbacks to be added after connection is established
 * @type {object[]}
 */
const addOnConnect = [];

/**
 * @description Names of the queues being listened to
 * @type {string[]}
 */
const queues = [];

/**
 * @description The channel to the message broker
 * @type {Channel}
 */
let ch;

/**
 * @description The connection to the message broker
 * @type {Connection}
 */
let conn;

/**
 * @function addListener
 * @description Adds a listener to the queue
 * @param {string} queueName
 * @param {function} callback
 * @returns {void}
 */
const addListener = (queueName, callback) => {

    // Check if the queue is already being listened to
    if (queues.includes(queueName)) {
        throw new Error(`Queue ${queueName} is already being listened to.`);
    }

    // If the connection is not established, add the listener to the queue
    // to be added after the connection is established
    if (!conn || !ch) {
        addOnConnect.push({ queueName, callback });
        return;
    }

    // Track the queue
    queues.push(queueName);

    // Listen to the queue
    ch.assertQueue(queueName, { durable: false });
    ch.consume(queueName, (msg) => {
        // Parse the message
        const text = msg.content.toString();
        const json = JSON.parse(text);
        // Call the callback
        callback(json);
    }, { noAck: true });
};

/**
 * @function removeListener
 * @description Removes a listener from the queue
 * @param {string} queueName
 * @returns {void}
 */
const removeListener = (queueName) => {
    // Check if the queue is being listened to
    if (!queues.includes(queueName)) {
        throw new Error(`Queue ${queueName} is not being listened to.`);
    }

    // Remove the listener
    queues.splice(queues.indexOf(queueName), 1);

    // Cancel the queue
    ch.cancel(queueName);
};

/**
 * @function sendMessage
 * @description Sends a message to the queue
 * @param {string} queueName
 * @param {object} msg
 * @returns {void}
 */
const sendMessage = (queueName, msg) => {
    // Convert the message to text
    const text = JSON.stringify(msg);
    // Send the message
    ch.assertQueue(queueName, { durable: false });
    ch.sendToQueue(queueName, Buffer.from(text));
};

/**
 * @function connect
 * @description Connects to the message broker
 * @returns {Promise<void>}
 */
const connect = async () => {
    conn = await pkg.connect(url);
    ch = await conn.createChannel();

    // Add the listeners that were added before the connection was established
    for (const conf of addOnConnect) {
        addListener(conf.queueName, conf.callback);
    }
}

/**
 * @function isConnected
 * @description Checks if the connection is established
 * @returns {boolean}
 */
const isConnected = () => {
    return conn && ch;
}

/**
 * @function getChannel
 * @description Gets the channel
 * @returns {Channel}
 */
const getChannel = () => {
    return ch;
}

/**
 * @function getConnection
 * @description Gets the connection
 * @returns {Connection}
 */
const getConnection = () => {
    return conn;
}

/**
 * @function close
 * @description Closes the connection
 * @returns {Promise<void>}
 */
const close = async () => {
    await ch.close();
    await conn.close();
}

export default {
    connect,
    addListener,
    removeListener,
    sendMessage,
    isConnected,
    getChannel,
    getConnection,
    close
}

