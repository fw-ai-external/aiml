import { z } from "zod";
import { StepValue } from "../runtime/StepValue";
export class BaseElement {
    id;
    key;
    tag;
    role;
    elementType;
    attributes;
    children;
    allowedChildren;
    schema;
    propsSchema;
    description;
    onExecutionGraphConstruction;
    enter;
    exit;
    type = "element";
    lineStart;
    lineEnd;
    columnStart;
    columnEnd;
    // Internal state and helpers
    _dataModel = {};
    _eventQueue = [];
    _parent;
    stepConditions;
    _isActive = false;
    constructor(config) {
        this.id = config.id;
        this.key = config.key;
        this.tag = config.tag;
        this.role = config.role;
        this.elementType = config.elementType;
        this.attributes = config.attributes ?? {};
        this.children = config.children ?? [];
        this._parent = config.parent
            ? config.parent
            : undefined;
        this.allowedChildren = config.allowedChildren;
        this.schema = config.schema;
        this.onExecutionGraphConstruction = config.onExecutionGraphConstruction;
        this.enter = config.enter;
        this.exit = config.exit;
        this.propsSchema = config.propsSchema ?? z.object({});
        this.description = config.description;
        this.lineStart = config.lineStart ?? 0;
        this.lineEnd = config.lineEnd ?? 0;
        this.columnStart = config.columnStart ?? 0;
        this.columnEnd = config.columnEnd ?? 0;
    }
    get parent() {
        return this._parent?.deref();
    }
    get isActive() {
        return this._isActive;
    }
    set isActive(value) {
        this._isActive = value;
    }
    get dataModel() {
        return this._dataModel;
    }
    set dataModel(value) {
        this._dataModel = value;
    }
    get eventQueue() {
        return this._eventQueue;
    }
    set eventQueue(value) {
        this._eventQueue = value;
    }
    get conditions() {
        return this.stepConditions;
    }
    set conditions(value) {
        this.stepConditions = value;
    }
    async execute(context, childrenNodes = []) {
        if (!this._isActive) {
            this._isActive = true;
            if (this.enter)
                await this.enter();
        }
        let resultObject = {};
        if (["state", "user-input", "output"].includes(this.role)) {
            resultObject = { id: this.id, isActive: this._isActive };
        }
        const result = new StepValue({
            type: "object",
            object: resultObject,
            raw: JSON.stringify(resultObject),
            wasHealed: false,
        });
        this._dataModel = {
            ...this._dataModel,
            [this.id]: result,
        };
        return result;
    }
    async deactivate() {
        if (this._isActive) {
            if (this.exit)
                await this.exit();
            this._isActive = false;
        }
    }
    getDefaultStepConditions() {
        return undefined;
    }
    getStepConditions() {
        return this.stepConditions ?? this.getDefaultStepConditions();
    }
    evaluateExpr(expr, context) {
        const fnBody = `with(_data) { with(context) { return ${expr}; } }`;
        return new Function("context", "_data", fnBody)(context, this._dataModel);
    }
    getParentOfType(type) {
        let current = this.parent;
        while (current) {
            if (current.elementType === type) {
                return current;
            }
            current = current.parent;
        }
        return undefined;
    }
    getRootElement() {
        let current = this;
        while (current.parent) {
            current = current.parent;
        }
        return current;
    }
    enqueueEvent(name, data) {
        this.getRootElement()._eventQueue.push({ name, data });
    }
}
// export type PropsOfComponent<T extends Component<any>> =
//   T extends Component<infer P> ? P : never;
export function isElement(value) {
    return value !== null && typeof value === "object" && "tag" in value;
}
export function Fragment({ children }) {
    return children;
}
//# sourceMappingURL=BaseElement.js.map