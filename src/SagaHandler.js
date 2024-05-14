import BrokerService from './BrokerService.js';
import { v4 as uuidv4 } from 'uuid';

const states = {
    PENDING: "PENDING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
}

const types = {
    START: "start",
    CHAIN: "chain",
    COMPLETE: "complete"
}

/**
 * @class SagaHandler
 * @description A class that handles the event of a choregraphed saga
 */
class SagaHandler {
    constructor(opt = {}, queueService = BrokerService) {
        if (!opt.eventName) {
            throw new Error('EventName is required');
        }

        if (!queueService) {
            throw new Error('QueueService is required');
        }

        const eventName = opt.eventName;
        const completeEventName = `${eventName}_COMPLETE`;
        const reduceEventName = `${eventName}_REDUCE`;

        const nextEventName = opt.nextEventName;
        const reduceNextEventName = `${nextEventName}_REDUCE`;
        const completeNextEventName = `${nextEventName}_COMPLETE`;

        const type = opt.type;
        const that = this;

        const executeCallback = async (callback, state, params = null) => {
            return await callback(uuidv4(), state, params);
        }

        const executeSend = async (eventName, params, error) => {
            queueService.sendMessage(eventName, {
                params,
                error,
                message_uuid: uuidv4(),
            });
        }

        this.initiateEvent = async function (callback) {
            if (type === types.START) {
                that.start = async (params) => {
                    if (opt.defaultParams) {
                        params = { ...opt.defaultParams, ...params };
                    }
                    
                    const msg = await executeCallback(callback, states.PENDING, params);
                    await executeSend(eventName, msg);
                }
            } else if (type === types.CHAIN) {
                queueService.addListener(eventName, async (response) => {
                    try {
                        const msg = await executeCallback(callback, states.PENDING, response);
                        await executeSend(nextEventName, msg);
                    } catch (error) {
                        await executeSend(reduceEventName, response.params, error.message);
                        that.reduce({ params: response.params, error: error.message });
                    }
                });

            } else if (type === types.COMPLETE) {
                queueService.addListener(eventName, async (response) => {
                    try {
                        const msg = await executeCallback(callback, states.COMPLETED, response);
                        await executeSend(completeEventName, msg);
                    } catch (error) {
                        await executeSend(reduceEventName, response.params, error.message);
                        that.reduce({ params: response.params, error: error.message });
                    }
                });
            }

        };

        this.onCompleteEvent = function (callback) {
            if (type === types.START) {
                queueService.addListener(completeEventName, async (response) => {
                    await executeCallback(callback, states.COMPLETED, response);
                });
            } else if (type === types.CHAIN) {
                queueService.addListener(completeNextEventName, async (response) => {
                    try {
                        const msg = await executeCallback(callback, states.COMPLETED, response);
                        await executeSend(completeEventName, msg);
                    } catch (error) {
                        await executeSend(reduceEventName, response.params, error.message);
                    }
                });
            }
        };

        this.onReduceEvent = function (callback) {
            that.reduce = async (_response) => {
                if (type === types.START) {
                    queueService.addListener(reduceEventName, async (response) => {
                        await executeCallback(callback, states.FAILED, response);
                    });
                } else if (type === types.CHAIN) {
                    queueService.addListener(reduceNextEventName, async (response) => {
                        try {
                            await executeCallback(callback, states.FAILED, response);
                            await executeSend(reduceEventName, response.params, response.error);
                        } catch (error) {
                            await executeSend(reduceEventName, response.params, response.error);
                        }
                    });
                } else {
                    await executeCallback(callback, states.FAILED, _response);
                }
            }

            that.reduce();
        }
    }
}

export default {
    handler: SagaHandler,
    states,
    types
};
