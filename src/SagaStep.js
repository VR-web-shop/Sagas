
export default class SagaStep {
    constructor(name, action, reducer) {
        this.name = name.replace(/ /g, '_').toUpperCase();
        this.action = action;
        this.reducer = reducer;
    }
}