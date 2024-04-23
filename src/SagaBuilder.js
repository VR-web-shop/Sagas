import Saga from './Saga.js';
import SagaStep from './SagaStep.js';
import BrokerService from "./BrokerService.js";

export default class SagaBuilder {
    constructor(brokerService=BrokerService) {
        this.saga = new Saga(brokerService);
    }

    on(name, options={}) {
        const action = options.action || ((params) => {});
        const reducer = options.reducer || ((reply) => {});
        this.saga.addStep(new SagaStep(name, action, reducer));
        return this;
    }

    resolve(resolver) {
        this.saga.setResolver(resolver);
        return this;
    }

    build() {
        return this.saga;
    }
}
