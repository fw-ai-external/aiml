import type { CoreAssistantMessage, CoreToolMessage, CoreUserMessage, UserContent } from "ai";
import { StepValue } from "@fireworks/shared";
import { Secrets, type RunstepOutput } from "@fireworks/types";
import { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
type TagNodeDTO = any;
interface StepContext<T extends RunstepOutput> {
    input: StepValue<T>;
    datamodel: Record<string, any>;
    state: {
        id: string;
        attributes: Record<string, any>;
        input: StepValue<T>;
    };
    stepResults: Record<string, any>;
    triggerData: Record<string, any>;
    attempts: Record<string, number>;
    getStepPayload: () => any;
}
export type ElementExecutionContextSerialized = Record<string, any>;
export declare class ElementExecutionContext<PropValues extends {}, InputValue extends RunstepOutput = RunstepOutput> {
    static builtinKeys: string[];
    input: StepValue<InputValue>;
    workflowInput: {
        userMessage: UserContent;
        systemMessage?: string;
        chatHistory: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
        clientSideTools: ChatCompletionMessageToolCall.Function[];
    };
    datamodel: Record<string, any>;
    attributes: PropValues & {
        children?: TagNodeDTO[];
    };
    state: {
        id: string;
        attributes: Record<string, any>;
        input: StepValue<InputValue>;
    };
    machine: {
        id: string;
        secrets: Secrets;
    };
    run: {
        id: string;
    };
    runId: string;
    context: StepContext<InputValue>;
    suspend: () => Promise<void>;
    constructor(params: {
        input: StepValue<InputValue>;
        workflowInput: {
            userMessage: UserContent;
            systemMessage?: string;
            chatHistory: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
            clientSideTools: ChatCompletionMessageToolCall.Function[];
        };
        datamodel: Record<string, any>;
        attributes: PropValues;
        state: {
            id: string;
            attributes: Record<string, any>;
            input: StepValue<InputValue>;
        };
        machine: {
            id: string;
            secrets: Secrets;
        };
        run: {
            id: string;
        };
    });
    serialize(): Promise<{
        input: string | import("@fireworks/types").JSONObject | import("@fireworks/types").OpenAIToolCall[] | null;
        workflowInput: {
            userMessage: UserContent;
            systemMessage?: string;
            chatHistory: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
            clientSideTools: ChatCompletionMessageToolCall.Function[];
        };
        datamodel: any;
        attributes: PropValues & {
            children?: TagNodeDTO[];
        };
        state: {
            id: string;
            attributes: Record<string, any>;
            input: string | import("@fireworks/types").JSONObject | import("@fireworks/types").OpenAIToolCall[] | null;
        };
        run: {
            id: string;
        };
        context: StepContext<InputValue>;
    }>;
}
export {};
//# sourceMappingURL=ElementExecutionContext.d.ts.map