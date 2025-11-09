import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ChatRequest, SSEEvent } from './types';
import { MyFirstAgent } from '@/ai/agent/agent';


/**
 * POST /api/chat/stream-structured
 * Server-Sent Events streaming with structured events for Generative UI
 * Emits: thinking, tool_call_start, tool_result, ui_component, text
 */
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, threadId } = body;

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required and must be a string' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Generate thread ID if not provided
        const finalThreadId = threadId || uuidv4();

        // Create a ReadableStream for SSE
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: SSEEvent) => {
                    const data = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                };

                try {
                    // Initialize the agent
                    const agent = MyFirstAgent.getInstance();
                    await agent.initialize();

                    sendEvent({ type: 'start', data: { threadId: finalThreadId } });

                    // Use the agent's streamStructured method
                    let fullResponse = '';
                    let detectedThematic: string | undefined;

                    for await (const event of agent.streamStructured(message, finalThreadId)) {
                        sendEvent(event);

                        // Accumulate text for final response
                        if (event.type === 'thinking') {
                            fullResponse += event.data.content + '\n';
                        }

                        // Detect thematic from advanced_knowledge_search tool calls
                        if (event.type === 'tool_result' &&
                            event.data.toolName === 'advanced_knowledge_search' &&
                            event.data.result?.meta?.thematic) {
                            detectedThematic = event.data.result.meta.thematic;
                        }
                    }

                    const trimmedResponse = fullResponse.trim();

                    // Send completion event
                    sendEvent({
                        type: 'complete',
                        data: {
                            threadId: finalThreadId,
                            response: trimmedResponse
                        }
                    });

                    // Generate query suggestions after completion (await before closing stream)
                    try {
                        const { querySuggester } = await import('@/ai/rag/query-suggester');

                        const suggestions = await querySuggester.suggestQueries({
                            userQuery: message,
                            agentResponse: trimmedResponse,
                            thematic: detectedThematic as any,
                        });

                        // Send suggestions event
                        sendEvent({
                            type: 'query_suggestions',
                            data: {
                                suggestions: suggestions.suggestions,
                                thematic: suggestions.thematic,
                                confidence: suggestions.confidence,
                            }
                        });
                    } catch (error) {
                        console.error('[API] Failed to generate query suggestions:', error);
                        // Don't fail the whole request if suggestions fail
                    }

                } catch (error) {
                    console.error('Error in SSE stream:', error);
                    sendEvent({
                        type: 'error',
                        data: {
                            error: 'Failed to process request',
                            details: error instanceof Error ? error.message : 'Unknown error'
                        }
                    });
                } finally {
                    controller.close();
                }
            }
        });

        // Return SSE response
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Error in /api/chat/stream-structured:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to start stream',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
