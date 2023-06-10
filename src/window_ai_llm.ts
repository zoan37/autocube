import { LLMResult } from 'langchain/schema';
import { BaseLLM } from 'langchain/llms/base';
import { getWindowAI } from 'window.ai';

// TODO: look into extending BaseChatModel instead of BaseLLM
export class WindowAILLM extends BaseLLM {
    async _generate(prompts: string[], _stop?: string[] | undefined): Promise<LLMResult> {
        const ai = await getWindowAI();

        // @ts-ignore
        // const ai = window.ai;

        console.log('window.ai:');
        console.log(ai);

        // TODO: Not sure if prompts is meant to be processed in separate calls or in a single 
        // call. For now, we'll assume it's a single call.
        const messages = prompts.map((prompt) => ({
            role: "user",
            content: prompt,
        }));

        const request = {
            messages: messages,
        };

        console.log('window.ai request:');
        console.log(request);

        // @ts-ignore
        const response = await ai.getCompletion(request, {
            temperature: 0.1,
        });

        console.log('window.ai response:');
        console.log(response);

        const result = {
            generations: [
                [
                    {
                        // @ts-ignore
                        text: response.message.content,
                    },
                ],
            ],
        };

        return result;
    }

    _llmType(): string {
        return 'window.ai';
    }
}