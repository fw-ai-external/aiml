import { ResponseStreamEvent } from "openai/resources/responses/responses";
import {
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions/completions";

export type OpenAIResponseStreamEvent = ResponseStreamEvent;

export type OpenAIChatCompletionChunk = ChatCompletionChunk;

export type OpenAIChatCompletion = ChatCompletion;
