import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig, AIConfig } from './config';

export const aiGenerator = {
    generate: async (prompt: string, config: AIConfig): Promise<string> => {
        if (!config.apiKey) {
            throw new Error('API Key is missing. Please configure AI settings.');
        }

        try {
            switch (config.provider) {
                case 'google':
                    return await generateGoogle(prompt, config);
                case 'openai':
                    return await generateOpenAI(prompt, config);
                case 'anthropic':
                    return await generateAnthropic(prompt, config);
                default:
                    throw new Error('Unsupported provider');
            }
        } catch (error: any) {
            safeError('AI Generation Error:', error);
            throw new Error(error.message || 'Failed to generate response');
        }
    }
};

async function generateGoogle(prompt: string, config: AIConfig): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const model = ai.models;
    
    // Use the selected model or fallback to a safe default
    const modelName = config.model || 'gemini-1.5-flash';

    const result = await model.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            // Only apply thinking/grounding if supported by the model/SDK version
            // For now, we keep it simple as the SDK might not support all config flags directly in this way
            // or they might be specific to certain models.
            // thinkingConfig: config.thinkingMode ? { thinkingLevel: 'HIGH' } : undefined, // Example if supported
            // tools: config.searchGrounding ? [{ googleSearch: {} }] : undefined, // Example if supported
        }
    });
    
    return result.text || 'No response generated.';
}

async function generateOpenAI(prompt: string, config: AIConfig): Promise<string> {
    const openai = new OpenAI({
        apiKey: config.apiKey,
    });

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: config.model || 'gpt-4o',
    });

    return completion.choices[0]?.message?.content || 'No response generated.';
}

async function generateAnthropic(prompt: string, config: AIConfig): Promise<string> {
    const anthropic = new Anthropic({
        apiKey: config.apiKey,
    });

    const message = await anthropic.messages.create({
        model: config.model || 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
    });

    // Anthropic returns an array of content blocks. We need to extract the text.
    const textBlock = message.content.find(c => c.type === 'text');
    return textBlock?.text || 'No response generated.';
}
