import SagaStep from "./SagaStep.js";
import BrokerService from "./BrokerService.js";

const REDUCE = 'REDUCE';
const REDUCE_HANDLER = 'REDUCE_HANDLER';

export default class Saga {
    constructor(brokerService=BrokerService) {
        if (!brokerService) {
            throw new Error('brokerService is required.');
        }

        this.steps = [];
        this.currentStep = 0;
        this.resolver = async (params) => {};
        this.brokerService = brokerService;
    }

    setResolver(resolver) {
        this.resolver = resolver;
    }

    reduce(params) {
        const stepName = params.stepName;
        params = {
            ...params.params,
            transaction_state_name: 'FAILED',
            transaction_message: params.error
        }
        const steps = this.steps;
        const stepIndex = steps.findIndex((s) => s.name === stepName);
        if (stepIndex === -1) {
            return;
        }

        for (let i = stepIndex; i > -1; i--) {
            steps[i].reducer(params);
            const reduceHandlerName = Saga.getReduceHandlerName(steps[i].name);
            if (i !== 0) this.brokerService.sendMessage(reduceHandlerName, params);
        }
    }

    addStep(step) {
        if (!(step instanceof SagaStep)) {
            throw new Error('Invalid argument type. Expected SagaStep.');
        }

        const reducerName = Saga.getReducerName(step.name);
        this.brokerService.addListener(reducerName, ((params) => {
            console.log('REDUCING', params);
            this.reduce(params);
        }).bind(this));
        this.steps.push(step);
    }

    async execute(params) {
        if (this.currentStep >= this.steps.length) {
            this.resolve(params);
            this.currentStep = 0;
            return;
        }

        params = {
            ...params,
            transaction_state_name: 'PENDING'
        }

        const step = this.steps[this.currentStep];
        const name = step.name;

        try {
            const msg = await step.action(params);
            this.currentStep++;
            this.brokerService.sendMessage(name, msg);
            await this.execute(params);
        } catch (error) {
            this.reduce({ params, error });
        }
    }

    async resolve(params) {
        delete params.transaction_state_name;
        params = {
            ...params,
            transaction_state_name: 'COMPLETED'
        }
        await this.resolver(params);
    }

    static getReducerName(stepName) {
        return `${REDUCE}_${stepName}`;
    }

    static getReduceHandlerName(stepName) {
        return `${REDUCE_HANDLER}_${stepName}`;
    }
}
