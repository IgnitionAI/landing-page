import { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

/**
 * Configuration for context management
 */
export interface ContextConfig {
    maxHistoryMessages: number;
    enableSummarization: boolean;
    summaryTriggerThreshold: number;
    enableMetadataExtraction: boolean;
}

/**
 * Default context configuration
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
    maxHistoryMessages: 10,
    enableSummarization: true,
    summaryTriggerThreshold: 6,
    enableMetadataExtraction: true,
};

/**
 * User preferences and context extracted from conversation
 */
export interface UserMetadata {
    preferences?: {
        budget?: string;
        travelStyle?: string;
        destinations?: string[];
        dates?: string;
    };
    currentContext?: {
        destination?: string;
        dates?: string;
        travelers?: number;
        purpose?: string;
    };
}

/**
 * Manages conversation context to optimize token usage using LLM
 */
export class ContextManager {
    private config: ContextConfig;
    private conversationSummaries: Map<string, string> = new Map();
    private userMetadata: Map<string, UserMetadata> = new Map();
    private llm: ChatOpenAI;

    constructor(llm: ChatOpenAI, config: Partial<ContextConfig> = {}) {
        this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };
        this.llm = llm;
    }

    /**
     * Trim message history to keep only recent messages
     */
    trimHistory(messages: BaseMessage[]): BaseMessage[] {
        if (messages.length <= this.config.maxHistoryMessages) {
            return messages;
        }

        // Always keep the first message (often contains important context)
        const firstMessage = messages[0];
        const recentMessages = messages.slice(-this.config.maxHistoryMessages + 1);
        
        return [firstMessage, ...recentMessages];
    }

    /**
     * Extract user metadata from conversation using LLM
     */
    async extractMetadata(messages: BaseMessage[], threadId: string): Promise<UserMetadata> {
        if (!this.config.enableMetadataExtraction) {
            return {};
        }

        const conversationText = messages
            .filter(m => m.type === 'human')
            .map(m => m.content)
            .join('\n');

        const prompt = `Extract travel preferences and context from this conversation. Return ONLY a JSON object.

Conversation:
${conversationText}

Extract all pertinent information from the conversation.
Respect this generic format and adapt keys to the conversation : 
{
    "parentKey": {
        "childKey": "value",
        "childKey": "value",
        "childKey": "value"
    },
    "parentKey": {
        "childKey": "value",
        "childKey": "value",
        "childKey": "value"
    }
}

Return JSON only, no explanation:`;

        try {
            const response = await this.llm.invoke([
                { role: "user", content: prompt }
            ]);

            let content = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);

            // Clean markdown code blocks if present
            content = content.trim();
            if (content.startsWith('```json')) {
                content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
            } else if (content.startsWith('```')) {
                content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
            }
            content = content.trim();

            const metadata = JSON.parse(content) as UserMetadata;
            this.userMetadata.set(threadId, metadata);
            return metadata;
        } catch (error) {
            console.error('[ContextManager] Failed to extract metadata:', error);
            return {};
        }
    }

    /**
     * Create a summary of conversation history using LLM
     */
    async summarizeHistory(
        messages: BaseMessage[],
        threadId: string
    ): Promise<string> {
        if (!this.config.enableSummarization) {
            return '';
        }

        const conversationText = messages
            .map(m => {
                const role = m.type === 'human' ? 'User' : 'Assistant';
                const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                return `${role}: ${content}`;
            })
            .join('\n');

        const prompt = `Summarize this travel conversation in 2-3 concise sentences. Focus on:
- What the user is looking for
- Key preferences mentioned
- Current stage of planning

Conversation:
${conversationText}

Summary (2-3 sentences):`;

        try {
            const response = await this.llm.invoke([
                { role: "user", content: prompt }
            ]);

            let summary = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);

            // Clean markdown formatting if present
            summary = summary.trim();
            if (summary.startsWith('```')) {
                summary = summary.replace(/^```[a-z]*\s*/, '').replace(/```\s*$/, '');
            }
            summary = summary.trim();

            this.conversationSummaries.set(threadId, summary);
            return summary;
        } catch (error) {
            console.error('[ContextManager] Failed to summarize:', error);
            return '';
        }
    }

    /**
     * Get conversation summary for a thread
     */
    getSummary(threadId: string): string | undefined {
        return this.conversationSummaries.get(threadId);
    }

    /**
     * Get user metadata for a thread
     */
    getMetadata(threadId: string): UserMetadata | undefined {
        return this.userMetadata.get(threadId);
    }

    /**
     * Check if summarization should be triggered
     */
    shouldSummarize(messageCount: number): boolean {
        return (
            this.config.enableSummarization &&
            messageCount >= this.config.summaryTriggerThreshold
        );
    }

    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text: string): number {
        // Rough estimate: 1 token ≈ 4 characters for English
        return Math.ceil(text.length / 4);
    }

    /**
     * Calculate total tokens in messages
     */
    calculateMessageTokens(messages: BaseMessage[]): number {
        let total = 0;
        for (const msg of messages) {
            const content = typeof msg.content === 'string' 
                ? msg.content 
                : JSON.stringify(msg.content);
            total += this.estimateTokens(content);
        }
        return total;
    }
}
