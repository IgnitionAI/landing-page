import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { MultiServerMCPClient } from "@langchain/mcp-adapters"; 
import { DynamicStructuredTool } from "@langchain/core/tools";
import { config } from "../../config";
import { z } from "zod";
import { ContextManager } from "../context/context-manager";
import { IGNITIONAI_ASSISTANT_PROMPT } from "../prompts/system-prompts";
import { ChatOpenAI } from "@langchain/openai";

// Zod schemas for runtime validation
const MessageContentSchema = z.object({
    type: z.string(),
    text: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    input: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

const ToolCallSchema = z.object({
    id: z.string(),
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
});

const BaseMessageSchema = z.object({
    id: z.string().optional(),
    type: z.string(),
    content: z.union([
        z.string(),
        z.array(MessageContentSchema),
        z.record(z.string(), z.unknown())
    ]),
    tool_calls: z.array(ToolCallSchema).optional(),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
    _getType: z.any().optional(),
});

const ToolResultSchema = z.object({
    success: z.boolean(),
    data: z.array(z.unknown()).optional(),
    meta: z.object({
        totalAvailable: z.number().optional(),
    }).optional(),
    error: z.string().optional(),
});

// TypeScript types inferred from Zod schemas
//type MessageContent = z.infer<typeof MessageContentSchema>;
type ToolCall = z.infer<typeof ToolCallSchema>;
type BaseMessage = z.infer<typeof BaseMessageSchema>;
type ToolResult = z.infer<typeof ToolResultSchema>;

class MyFirstAgent {
    private model: ChatOpenAI;
    private tools: DynamicStructuredTool[];
    private memory: MemorySaver;
    private graph: any;
    private mcpClient: MultiServerMCPClient | null = null;
    private isInitialized: boolean = false;
    private contextManager: ContextManager;

    // Singleton
    private static instance: MyFirstAgent;

    private constructor() {
        this.model = new ChatOpenAI({
            apiKey: config.openai_api_key,
            model: config.llm_name || "gpt-4.1-nano",
            streaming: true,
            temperature: 0.5,
            tags: ["IgnitionAI Agent"]
        });
        
        this.tools = [];
        this.memory = new MemorySaver();
        this.graph = null;
        this.contextManager = new ContextManager(this.model, {
            maxHistoryMessages: 10,
            enableSummarization: true,
            summaryTriggerThreshold: 6,
            enableMetadataExtraction: true,
        });
    }

    static getInstance(): MyFirstAgent {
        if (!MyFirstAgent.instance) {
            MyFirstAgent.instance = new MyFirstAgent();
        }
        return MyFirstAgent.instance;
    }

    /**
     * Initialize the MCP client and load tools
     * Must be called before using the agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn("Agent already initialized");
            return;
        }


        this.mcpClient = new MultiServerMCPClient({  
            amadeus: {
                transport: "http",
                url: config.amadeus_url,
                headers: {
                    "Authorization": `Bearer ${config.amadeus_bearer_token}`
                }
            },
            nutrition: {
                transport: "http",
                url: config.nutrition_url,
            }
        });


        const mcpTools = await this.mcpClient.getTools();
        
        // Outil pour obtenir la date actuelle
        const getCurrentDateTool = new DynamicStructuredTool({
            name: "get_current_date",
            description: "Returns the current date with day, month, and year. Use this tool when you need to know today's date.",
            schema: z.object({}),
            func: async () => {
                const now = new Date();
                return JSON.stringify({
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    formatted: now.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }),
                    iso: now.toISOString()
                });
            }
        });
        
        this.tools = [...mcpTools, getCurrentDateTool]; 

        // Create the ReAct agent with optimized prompt
        this.graph = createAgent({
            model: this.model,
            tools: this.tools,
            checkpointer: this.memory,
            systemPrompt: IGNITIONAI_ASSISTANT_PROMPT
        });

        this.isInitialized = true;
        console.log(`Agent initialized with ${this.tools.length} tools`);
    }

    /**
     * Ensure the agent is initialized before operations
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.graph) {
            throw new Error("Agent not initialized. Call initialize() first.");
        }
    }

    /**
     * Prepare context for conversation
     */
    private async prepareContext(threadId: string): Promise<void> {
        const state = await this.graph.getState({ configurable: { thread_id: threadId } });
        const messages = state.values?.messages || [];

        if (messages.length === 0) return;

        // Extract metadata every 3 messages
        if (this.contextManager.getMetadata(threadId) === undefined || messages.length % 3 === 0) {
            console.log('[Agent] Extracting user metadata...');
            await this.contextManager.extractMetadata(messages, threadId);
        }

        // Summarize if threshold reached
        if (this.contextManager.shouldSummarize(messages.length)) {
            console.log('[Agent] Creating conversation summary...');
            await this.contextManager.summarizeHistory(messages, threadId);
        }

        // Log token usage
        const tokenCount = this.contextManager.calculateMessageTokens(messages);
        console.log(`[Agent] Current conversation: ${messages.length} messages, ~${tokenCount} tokens`);
    }

    async invoke(message: string, threadId: string = "default") {
        this.ensureInitialized();
        
        // Prepare context before invoking
        await this.prepareContext(threadId);
        
        const config = { 
            configurable: { thread_id: threadId },
            tags: ["travel-agent", "context-engineering", "optimized", `thread:${threadId}`],
            metadata: {
                optimization: "enabled",
                thread_id: threadId,
                agent_type: "travel"
            }
        };
        
        // First invocation with the user message
        let result = await this.graph.invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );
        
        console.log('Initial invoke result messages:', result.messages.map((m: any) => ({
            type: m.type || m._getType?.(),
            content: typeof m.content === 'string' ? m.content.substring(0, 100) : JSON.stringify(m.content).substring(0, 100),
            hasToolCalls: !!m.tool_calls
        })));
        
        // Check if we need to continue (if last message has tool calls but no content)
        const lastMsg = result.messages[result.messages.length - 1];
        if (lastMsg.tool_calls && !lastMsg.content) {
            console.log('Tool calls detected, continuing execution...');
            // Continue execution to get the final response after tool execution
            result = await this.graph.invoke(null, config);
            console.log('After continuation:', result.messages.map((m: any) => ({
                type: m.type || m._getType?.(),
                content: typeof m.content === 'string' ? m.content.substring(0, 100) : JSON.stringify(m.content).substring(0, 100),
                hasToolCalls: !!m.tool_calls
            })));
        }
        
        // Find the last AI message with content
        for (let i = result.messages.length - 1; i >= 0; i--) {
            const msg = result.messages[i];
            if ((msg.type === 'ai' || msg._getType?.() === 'ai') && msg.content) {
                // Handle content that might be an array (Claude format)
                let content = typeof msg.content === 'string' 
                    ? msg.content 
                    : Array.isArray(msg.content) 
                        ? msg.content.map((c: any) => c.text || JSON.stringify(c)).join('')
                        : JSON.stringify(msg.content);
                
                // Extract only the Final Answer part if present (clean ReAct format)
                const finalAnswerMatch = content.match(/Final Answer:\s*([\s\S]*)/);
                if (finalAnswerMatch) {
                    content = finalAnswerMatch[1].trim();
                }
                
                console.log('Found AI message with content:', content.substring(0, 100));
                return content;
            }
        }
        
        // Fallback
        console.log('No AI message found, returning last message');
        const lastContent = result.messages[result.messages.length - 1].content;
        return typeof lastContent === 'string' ? lastContent : JSON.stringify(lastContent) || '';
    }

    async getState(threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        const state = await this.graph.getState(config);
        return state;
    }

    async approveAndContinue(threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        
        try {
            const stream = await this.graph.stream(null, config, { streamMode: "values" });
            let finalResponse = "";
            
            for await (const chunk of stream) {
                console.log('Continue stream chunk:', JSON.stringify(chunk, null, 2));
                
                // LangChain v1: node name changed from 'agent' to 'model'
                const nodeMessages = chunk.model?.messages || chunk.agent?.messages;
                if (nodeMessages) {
                    for (const message of nodeMessages) {
                        if (message.content && typeof message.content === 'string') {
                            finalResponse = message.content;
                            console.log('Found final response:', finalResponse);
                        }
                    }
                }
                
                if (!finalResponse && chunk.messages) {
                    const lastMessage = chunk.messages[chunk.messages.length - 1];
                    if (lastMessage && (lastMessage.type === 'ai' || lastMessage._getType?.() === 'ai')) {
                        finalResponse = lastMessage.content || "";
                    }
                }
            }
            
            console.log('Final response to return:', finalResponse);
            return finalResponse;
        } catch (error) {
            console.error('Error in approveAndContinue:', error);
            throw error;
        }
    }

    async invokeWithApproval(message: string, threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        
        const result = await this.graph.invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );

        const state = await this.graph.getState(config);
        
        if (state.next && state.next.includes("tools")) {
            const lastMessage = result.messages[result.messages.length - 1];
            return {
                needsApproval: true,
                toolCalls: lastMessage.tool_calls || [],
                threadId,
                partialResponse: lastMessage.content || ""
            };
        }

        return {
            needsApproval: false,
            response: result.messages[result.messages.length - 1].content,
            threadId
        };
    }

    async *stream(message: string, threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        const stream = await this.graph.stream(
            { messages: [{ role: "user", content: message }] },
            config,
            { streamMode: "values" }
        );

        let lastContent = '';
        for await (const chunk of stream) {
            console.log('Stream chunk keys:', Object.keys(chunk));
            
            // LangChain v1: node name changed from 'agent' to 'model'
            const messages = chunk.model?.messages || chunk.agent?.messages || chunk.messages;
            
            if (messages && Array.isArray(messages)) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && (lastMsg.type === 'ai' || lastMsg._getType?.() === 'ai')) {
                    let content = typeof lastMsg.content === 'string' 
                        ? lastMsg.content 
                        : Array.isArray(lastMsg.content) 
                            ? lastMsg.content.map((c: any) => c.text || '').join('')
                            : '';
                    
                    // Only yield if content changed (avoid duplicates)
                    if (content && content !== lastContent) {
                        // Extract Final Answer if present
                        const finalAnswerMatch = content.match(/Final Answer:\s*([\s\S]*)/);
                        if (finalAnswerMatch) {
                            content = finalAnswerMatch[1].trim();
                        }
                        
                        console.log('Yielding content:', content.substring(0, 100));
                        lastContent = content;
                        yield content;
                    }
                }
            }
        }
    }

    /**
     * Stream with structured events for Generative UI
     * Emits different event types: thinking, tool_call_start, tool_result, ui_component, text
     */
    async *streamStructured(message: string, threadId: string = "default") {
        this.ensureInitialized();
        
        // Prepare context before streaming
        await this.prepareContext(threadId);
        
        const config = { 
            configurable: { thread_id: threadId },
            tags: ["travel-agent", "context-engineering", "optimized", `thread:${threadId}`, "streaming"],
            metadata: {
                optimization: "enabled",
                thread_id: threadId,
                agent_type: "travel",
                stream_mode: "structured"
            }
        };
        const stream = await this.graph.stream(
            { messages: [{ role: "user", content: message }] },
            config,
            { streamMode: "updates" }
        );

        const processedMessageIds = new Set<string>();

        for await (const chunk of stream) {
            console.log('[streamStructured] Chunk received, keys:', Object.keys(chunk));
            
            for (const [nodeName, nodeData] of Object.entries(chunk)) {
                const messages = this.extractMessagesFromNode(nodeData, nodeName);
                if (!messages) continue;

                for (const msg of messages) {
                    if (this.isMessageProcessed(msg, processedMessageIds)) continue;
                    processedMessageIds.add(this.getMessageId(msg));

                    // Process AI messages
                    if (this.isAIMessage(msg)) {
                        yield* this.processAIMessage(msg);
                    }

                    // Process Tool messages
                    if (this.isToolMessage(msg)) {
                        yield* this.processToolMessage(msg);
                    }
                }
            }
        }
    }

    /**
     * Extract messages from node data
     */
    private extractMessagesFromNode(nodeData: any, nodeName: string): BaseMessage[] | null {
        const messages = nodeData?.messages || (Array.isArray(nodeData) ? nodeData : null);
        
        if (!messages || !Array.isArray(messages)) {
            console.log('[streamStructured] No messages in node:', nodeName);
            return null;
        }

        console.log('[streamStructured] Messages in node:', messages.length);
        return messages;
    }

    /**
     * Check if message has already been processed
     */
    private isMessageProcessed(msg: BaseMessage, processedIds: Set<string>): boolean {
        const msgId = this.getMessageId(msg);
        if (processedIds.has(msgId)) {
            console.log('[streamStructured] Skipping already processed message');
            return true;
        }
        return false;
    }

    /**
     * Generate unique message ID
     */
    private getMessageId(msg: BaseMessage): string {
        return msg.id || `${msg.type}-${JSON.stringify(msg.content).substring(0, 50)}`;
    }

    /**
     * Check if message is an AI message
     */
    private isAIMessage(msg: BaseMessage): boolean {
        return msg.type === 'ai' || msg._getType?.() === 'ai';
    }

    /**
     * Check if message is a tool message
     */
    private isToolMessage(msg: BaseMessage): boolean {
        return msg.type === 'tool' || msg._getType?.() === 'tool';
    }

    /**
     * Process AI messages and yield events
     */
    private async *processAIMessage(msg: BaseMessage) {
        console.log('[streamStructured] AI message detected');
        
        const { textContent, toolCalls } = this.extractAIMessageContent(msg);

        // Emit thinking event
        if (textContent) {
            const cleanText = this.extractThinkingText(textContent);
            if (cleanText) {
                yield {
                    type: 'thinking' as const,
                    data: { content: cleanText }
                };
            }
        }

        // Emit tool call events
        for (const toolCall of toolCalls) {
            yield {
                type: 'tool_call_start' as const,
                data: {
                    toolName: toolCall.name,
                    args: toolCall.args,
                    toolCallId: toolCall.id
                }
            };
        }
    }

    /**
     * Extract content and tool calls from AI message
     */
    private extractAIMessageContent(msg: BaseMessage): { textContent: string; toolCalls: ToolCall[] } {
        let textContent = '';
        let toolCalls: any[] = [];

        if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
                if (block.type === 'text') {
                    textContent += block.text;
                } else if (block.type === 'tool_use') {
                    let args = block.input;
                    // Parse string input, handle empty strings
                    if (typeof block.input === 'string') {
                        if (block.input.trim() === '') {
                            args = {};
                        } else {
                            try {
                                args = JSON.parse(block.input);
                            } catch (e) {
                                console.warn('[extractAIMessageContent] Failed to parse tool input, using empty object:', block.input);
                                args = {};
                            }
                        }
                    }
                    
                    toolCalls.push({
                        id: block.id,
                        name: block.name,
                        args: args
                    });
                }
            }
        } else if (typeof msg.content === 'string') {
            textContent = msg.content;
        }

        // Also check tool_calls property
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            toolCalls = msg.tool_calls;
        }

        return { textContent, toolCalls };
    }

    /**
     * Extract clean thinking text from ReAct format
     */
    private extractThinkingText(textContent: string): string {
        // Only extract and return Final Answer, skip Thoughts
        const finalAnswerMatch = textContent.match(/Final Answer:\s*([\s\S]+?)$/);
        
        if (finalAnswerMatch) {
            return finalAnswerMatch[1].trim();
        }
        
        // If no Final Answer, don't return anything (skip intermediate thoughts)
        return '';
    }

    /**
     * Process tool messages and yield events
     */
    private async *processToolMessage(msg: BaseMessage) {
        console.log('[streamStructured] Tool message detected, name:', msg.name);
        
        // Handle errors - log but don't show to user for non-critical tools
        if (typeof msg.content === 'string' && msg.content.startsWith('Error:')) {
            console.error('[streamStructured] Tool returned error:', msg.name, msg.content);
            // Don't show errors for optional/enhancement tools or data format errors
            const optionalTools = ['get_destination_experiences', 'get_current_date'];
            const isDataFormatError = msg.content.includes('Cannot read properties of undefined');
            
            if (optionalTools.includes(msg.name || '') || isDataFormatError) {
                // Log a user-friendly message for data errors
                if (isDataFormatError && msg.name) {
                    console.warn(`[streamStructured] ${msg.name} returned invalid data format, skipping`);
                }
                return;
            }
            yield {
                type: 'error' as const,
                data: {
                    error: `Tool ${msg.name || 'unknown'} failed`,
                    details: msg.content.substring(0, 200)
                }
            };
            return;
        }
        
        // Special handling for get_current_date tool (doesn't follow standard format)
        if (msg.name === 'get_current_date') {
            console.log('[streamStructured] get_current_date result:', msg.content);
            // Don't yield anything for this tool, it's used internally by the agent
            return;
        }
        
        // Parse tool result
        const result = this.parseToolResult(msg);
        if (!result) {
            yield {
                type: 'error' as const,
                data: {
                    error: `Tool ${msg.name || 'unknown'} failed`,
                    details: typeof msg.content === 'string' ? msg.content.substring(0, 200) : 'Unknown error'
                }
            };
            return;
        }
        
        // Transform and emit UI component or generic result
        const uiComponent = this.transformToUIComponent(msg.name || 'unknown', result);
        if (uiComponent) {
            yield uiComponent;
        } else {
            yield {
                type: 'tool_result' as const,
                data: {
                    toolName: msg.name,
                    toolCallId: msg.tool_call_id,
                    result: result,
                    summary: this.summarizeToolResult(msg.name || 'unknown', result)
                }
            };
        }
    }

    /**
     * Parse tool result from message content with Zod validation
     */
    private parseToolResult(msg: BaseMessage): ToolResult | null {
        try {
            const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
            
            // Validate with Zod schema
            const validationResult = ToolResultSchema.safeParse(parsed);
            
            if (validationResult.success) {
                return validationResult.data;
            } else {
                console.error('[streamStructured] Tool result validation failed:', validationResult.error.format());
                return null;
            }
        } catch (e) {
            console.error('[streamStructured] Failed to parse tool result as JSON:', e);
            return null;
        }
    }

    /**
     * Transform tool result to UI component event
     */
    private transformToUIComponent(toolName: string, result: ToolResult): any | null {
        if (toolName === 'search_tours_activities' && result.success && result.data) {
            return {
                type: 'ui_component' as const,
                data: {
                    component: 'ActivityList',
                    props: {
                        activities: result.data,
                        totalAvailable: result.meta?.totalAvailable || result.data.length
                    }
                }
            };
        }
        
        if (toolName === 'search_flights' && result.success && result.data && result.data.length > 0) {
            return {
                type: 'ui_component' as const,
                data: {
                    component: 'FlightList',
                    props: { flights: this.transformFlightsData(result.data) }
                }
            };
        }
        
        if (toolName === 'search_hotels' && result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            console.log('[streamStructured] Processing hotels, count:', result.data.length);
            return {
                type: 'ui_component' as const,
                data: {
                    component: 'HotelList',
                    props: { hotels: this.transformHotelsData(result.data) }
                }
            };
        }
        
        return null;
    }

    /**
     * Transform Amadeus flight data to UI format
     */
    private transformFlightsData(data: any[]): any[] {
        if (!data || !Array.isArray(data)) {
            console.warn('[transformFlightsData] Invalid data received:', data);
            return [];
        }
        return data.slice(0, 3).map((offer: any) => ({
            id: offer.id,
            price: {
                amount: parseFloat(offer.price?.total || offer.price?.grandTotal || '0'),
                currency: offer.price?.currency || 'EUR'
            },
            outbound: this.transformItinerary(offer.itineraries[0], offer.validatingAirlineCodes),
            inbound: this.transformItinerary(offer.itineraries[1], offer.validatingAirlineCodes)
        }));
    }

    /**
     * Transform flight itinerary
     */
    private transformItinerary(itinerary: any, validatingCodes: string[]): any {
        if (!itinerary) return {};
        
        const firstSegment = itinerary.segments[0];
        const lastSegment = itinerary.segments[itinerary.segments.length - 1];
        
        return {
            departure: {
                airport: {
                    code: firstSegment?.departure?.iataCode || '',
                    name: firstSegment?.departure?.iataCode || ''
                },
                time: firstSegment?.departure?.at || ''
            },
            arrival: {
                airport: {
                    code: lastSegment?.arrival?.iataCode || '',
                    name: lastSegment?.arrival?.iataCode || ''
                },
                time: lastSegment?.arrival?.at || ''
            },
            airline: {
                code: firstSegment?.carrierCode || '',
                name: validatingCodes?.[0] || firstSegment?.carrierCode || ''
            },
            duration: itinerary.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || '',
            stops: (itinerary.segments?.length || 1) - 1
        };
    }

    /**
     * Transform Amadeus hotel data to UI format
     */
    private transformHotelsData(data: any[]): any[] {
        if (!data || !Array.isArray(data)) {
            console.warn('[transformHotelsData] Invalid data received:', data);
            return [];
        }
        return data.slice(0, 4).map((hotelOffer: any) => {
            console.log('[streamStructured] Hotel offer:', hotelOffer.hotel?.name);
            return {
                id: hotelOffer.hotel?.hotelId || hotelOffer.id,
                name: hotelOffer.hotel?.name || 'Hotel',
                rating: 4,
                address: {
                    street: hotelOffer.hotel?.address?.lines?.[0] || '',
                    city: hotelOffer.hotel?.cityCode || '',
                    postalCode: hotelOffer.hotel?.address?.postalCode || ''
                },
                location: {
                    latitude: hotelOffer.hotel?.latitude || 0,
                    longitude: hotelOffer.hotel?.longitude || 0
                },
                description: hotelOffer.offers?.[0]?.room?.description?.text || 'Comfortable hotel room',
                amenities: ['WiFi', 'Air Conditioning', 'Room Service'],
                price: {
                    amount: parseFloat(hotelOffer.offers?.[0]?.price?.total || '0'),
                    currency: hotelOffer.offers?.[0]?.price?.currency || 'EUR'
                },
                images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800']
            };
        });
    }

    /**
     * Create a human-readable summary of tool results
     */
    private summarizeToolResult(toolName: string, result: any): string {
        if (!result || !result.success) return 'No results found';

        switch (toolName) {
            case 'search_cities':
                return `Found ${result.data?.length || 0} cities`;
            case 'search_tours_activities':
                return `Found ${result.meta?.totalAvailable || result.data?.length || 0} activities`;
            case 'search_hotels':
                return `Found ${result.data?.length || 0} hotels`;
            case 'search_flights':
                return `Found ${result.data?.length || 0} flights`;
            default:
                return 'Results received';
        }
    }

    getTools() {
        return this.tools;
    }

    /**
     * Get context statistics for a thread
     */
    async getContextStats(threadId: string = "default") {
        const state = await this.graph.getState({ configurable: { thread_id: threadId } });
        const messages = state.values?.messages || [];
        
        return {
            messageCount: messages.length,
            estimatedTokens: this.contextManager.calculateMessageTokens(messages),
            hasSummary: !!this.contextManager.getSummary(threadId),
            hasMetadata: !!this.contextManager.getMetadata(threadId),
            summary: this.contextManager.getSummary(threadId),
            metadata: this.contextManager.getMetadata(threadId),
        };
    }

    /**
     * Get the context manager instance
     */
    getContextManager() {
        return this.contextManager;
    }
}

const agent = MyFirstAgent.getInstance();
export default agent;
export { MyFirstAgent };