import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions/completions';
import type { ResponseStreamEvent } from 'openai/resources/responses/responses';

export type OpenAIResponseStreamEvent = ResponseStreamEvent;

export type OpenAIChatCompletionChunk = ChatCompletionChunk;

export type OpenAIChatCompletion = ChatCompletion;
