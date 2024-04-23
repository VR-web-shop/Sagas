import Saga from "./Saga.js";
import BrokerService from "./BrokerService.js";

export default class SagaHandler {
    constructor(stepName, brokerService=BrokerService) {
        if (!stepName) {
            throw new Error('stepName is required.');
        }

        if (!brokerService) {
            throw new Error('brokerService is required.');
        }

        this.stepName = stepName.replace(/ /g, '_').toUpperCase();
        this.reduceName = Saga.getReducerName(this.stepName);
        this.reduceHandlerName = Saga.getReduceHandlerName(this.stepName);
        this.brokerService = brokerService;
    }

    start() {
        this.brokerService.addListener(this.stepName, this.execute.bind(this));
        this.brokerService.addListener(this.reduceHandlerName, this.onReduce.bind(this));
    }

    stop() {
        this.brokerService.removeListener(this.stepName, this.execute.bind(this));
        this.brokerService.removeListener(this.reduceHandlerName, this.onReduce.bind(this));
    }

    async execute(params) {
        try {
            await this.onAction(params);
        } catch (error) {
            this.brokerService.sendMessage(this.reduceName, {
                params,
                error: error.message,
                stepName: this.stepName
            });
        }
    }

    async onReduce(params) {
        throw new Error('onReduce must be implemented.');
    }

    async onAction(params) {
        throw new Error('onAction must be implemented.');
    }
}
