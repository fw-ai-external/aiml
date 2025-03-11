// @deprecated get rid of this, its only used for testing now
// use the ElementExecutionContext type instead
export class ElementExecutionContext {
    // Static property for built-in keys that should match the serialized output
    static builtinKeys = [
        "input",
        "workflowInput",
        "datamodel",
        "attributes",
        "state",
        "run",
        "context",
    ];
    // Input into the active element via the output of the last
    input;
    // Input into the machine from the Request
    workflowInput;
    datamodel;
    attributes = {};
    state;
    machine;
    run;
    // Required by StepExecutionContext
    runId;
    context;
    suspend;
    constructor(params) {
        // TODO: validate input using input schema
        this.input = params.input;
        this.workflowInput = params.workflowInput;
        this.datamodel = params.datamodel;
        this.machine = params.machine;
        this.run = params.run;
        this.attributes = params.attributes ?? {};
        this.state = params.state;
        // Initialize StepExecutionContext properties
        this.runId = params.run.id;
        this.context = {
            input: params.input,
            datamodel: params.datamodel,
            state: params.state,
            stepResults: {},
            triggerData: {},
            attempts: {},
            getStepPayload: () => ({}),
        };
        this.suspend = async () => {
            // Implementation for suspend
        };
    }
    async serialize() {
        return {
            input: await this.input.simpleValue(),
            workflowInput: this.workflowInput,
            datamodel: this.datamodel.values,
            attributes: this.attributes,
            state: {
                id: this.state.id,
                attributes: this.state.attributes,
                input: await this.state.input.simpleValue(),
            },
            run: this.run,
            context: this.context,
        };
    }
}
//# sourceMappingURL=ElementExecutionContext.js.map