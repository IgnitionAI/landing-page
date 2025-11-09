import { ChatOpenAI } from "@langchain/openai";
import { config } from "../../config";

/**
 * Thematic templates for query enhancement
 * Each template guides the LLM to generate variations optimized for specific domains
 */
const THEMATIC_TEMPLATES = {
    ai_services: `You are a query expansion expert for AI services and solutions.
Given a user query, generate 3 diverse search query variations that will help find relevant information about:
- AI consulting and implementation services
- Machine learning solutions
- LLM and generative AI applications
- Enterprise AI transformation

Make the variations capture different aspects: technical implementation, business value, and use cases.`,

    chatbot: `You are a query expansion expert for chatbot and conversational AI systems.
Given a user query, generate 3 diverse search query variations that will help find relevant information about:
- Chatbot development and architecture
- Conversational AI design patterns
- Natural language processing
- Customer service automation

Make the variations capture different aspects: technical details, user experience, and integration.`,

    rag_systems: `You are a query expansion expert for RAG (Retrieval-Augmented Generation) systems.
Given a user query, generate 3 diverse search query variations that will help find relevant information about:
- RAG architecture and components
- Vector databases and embeddings
- Semantic search and ranking
- Document retrieval strategies

Make the variations capture different aspects: architecture, implementation, and optimization.`,

    multi_agent: `You are a query expansion expert for multi-agent AI systems.
Given a user query, generate 3 diverse search query variations that will help find relevant information about:
- Multi-agent architectures and coordination
- Agent communication protocols
- Distributed AI systems
- Autonomous agent design

Make the variations capture different aspects: system design, coordination, and scalability.`,

    general: `You are a query expansion expert for general AI and technology topics.
Given a user query, generate 3 diverse search query variations that will help find the most relevant information.

Make the variations capture different aspects:
1. Broad conceptual understanding
2. Specific technical details
3. Practical applications and use cases`
};

export type Thematic = keyof typeof THEMATIC_TEMPLATES;

export interface EnhancedQuery {
    original: string;
    variations: string[];
    thematic: Thematic;
    confidence: number;
}

/**
 * Prompt Enhancer - Generates optimized query variations using LLM
 *
 * This class uses an LLM to expand and enhance user queries by:
 * 1. Detecting the thematic domain (AI services, chatbot, RAG, etc.)
 * 2. Generating 3 diverse query variations optimized for that domain
 * 3. Ensuring variations capture different search intents
 */
export class PromptEnhancer {
    private llm: ChatOpenAI;
    private static instance: PromptEnhancer;

    private constructor() {
        // Use a faster, cheaper model for query enhancement
        this.llm = new ChatOpenAI({
            apiKey: config.openai_api_key,
            model: "gpt-4o-mini", // Fast and cost-effective for this task
            temperature: 0.7, // Some creativity for variations
            maxTokens: 200, // Keep responses concise
        });
    }

    static getInstance(): PromptEnhancer {
        if (!PromptEnhancer.instance) {
            PromptEnhancer.instance = new PromptEnhancer();
        }
        return PromptEnhancer.instance;
    }

    /**
     * Detect the thematic domain from a query
     * Uses keyword matching and heuristics for fast classification
     */
    private detectThematic(query: string): Thematic {
        const lowerQuery = query.toLowerCase();

        // Check for specific domains in order of specificity
        if (lowerQuery.match(/\b(rag|retrieval.?augmented|vector.?database|embedding|semantic.?search)\b/)) {
            return 'rag_systems';
        }

        if (lowerQuery.match(/\b(multi.?agent|agent.?system|autonomous.?agent|agent.?coordination)\b/)) {
            return 'multi_agent';
        }

        if (lowerQuery.match(/\b(chatbot|conversational.?ai|chat.?interface|virtual.?assistant|dialogue.?system)\b/)) {
            return 'chatbot';
        }

        if (lowerQuery.match(/\b(ai.?service|ai.?solution|machine.?learning|llm|gpt|claude|generative.?ai)\b/)) {
            return 'ai_services';
        }

        return 'general';
    }

    /**
     * Enhance a query by generating optimized variations
     *
     * @param query - The original user query
     * @param thematic - Optional thematic override (auto-detected if not provided)
     * @returns Enhanced query with variations
     */
    async enhanceQuery(query: string, thematic?: Thematic): Promise<EnhancedQuery> {
        const detectedThematic = thematic || this.detectThematic(query);
        const template = THEMATIC_TEMPLATES[detectedThematic];

        console.log(`[PromptEnhancer] Enhancing query with thematic: ${detectedThematic}`);

        try {
            const prompt = `${template}

Original query: "${query}"

Generate exactly 3 search query variations. Return them as a JSON array of strings.
Format: ["variation 1", "variation 2", "variation 3"]

Requirements:
- Each variation should be different from the others
- Keep variations concise (5-15 words)
- Make them specific and actionable for semantic search
- Variation 1: Broad conceptual
- Variation 2: Technical/specific
- Variation 3: Use case/practical application

JSON array:`;

            const response = await this.llm.invoke(prompt);
            const content = response.content.toString();

            // Extract JSON array from response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn('[PromptEnhancer] Failed to parse LLM response, using simple variations');
                return this.generateFallbackVariations(query, detectedThematic);
            }

            const variations = JSON.parse(jsonMatch[0]) as string[];

            // Validate we got 3 variations
            if (!Array.isArray(variations) || variations.length !== 3) {
                console.warn('[PromptEnhancer] Invalid variations count, using fallback');
                return this.generateFallbackVariations(query, detectedThematic);
            }

            console.log(`[PromptEnhancer] Generated variations:`, variations);

            return {
                original: query,
                variations,
                thematic: detectedThematic,
                confidence: 0.9, // High confidence for LLM-generated
            };

        } catch (error) {
            console.error('[PromptEnhancer] Error generating variations:', error);
            return this.generateFallbackVariations(query, detectedThematic);
        }
    }

    /**
     * Generate simple fallback variations without LLM
     * Used when LLM call fails or returns invalid data
     */
    private generateFallbackVariations(query: string, thematic: Thematic): EnhancedQuery {
        const variations = [
            query, // Original
            `${query} implementation guide best practices`, // Technical
            `how to ${query} use cases examples`, // Practical
        ];

        console.log(`[PromptEnhancer] Using fallback variations`);

        return {
            original: query,
            variations,
            thematic,
            confidence: 0.5, // Lower confidence for fallback
        };
    }

    /**
     * Batch enhance multiple queries in parallel
     */
    async enhanceQueries(queries: string[], thematic?: Thematic): Promise<EnhancedQuery[]> {
        return Promise.all(queries.map(q => this.enhanceQuery(q, thematic)));
    }
}

export const promptEnhancer = PromptEnhancer.getInstance();
