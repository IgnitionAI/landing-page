export interface ChatRequest {
    message: string;
    threadId?: string;
    userId?: string;
}

export interface ChatResponse {
    threadId: string;
    response: string;
}

// Tool call information
export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, any>;
}

// Activity data structure from Amadeus
export interface Activity {
    id: string;
    type: string;
    name: string;
    geoCode: {
        latitude: number;
        longitude: number;
    };
    pictures?: string[];
    bookingLink: string;
    price: {
        currencyCode: string;
        amount: string;
    };
    minimumDuration?: string;
}

// Flight data structure
export interface Flight {
    id: string;
    price: {
        amount: number;
        currency: string;
    };
    outbound: FlightSegment;
    inbound: FlightSegment;
}

export interface FlightSegment {
    departure: {
        airport: {
            code: string;
            name: string;
        };
        time: string;
    };
    arrival: {
        airport: {
            code: string;
            name: string;
        };
        time: string;
    };
    airline: {
        code: string;
        name: string;
    };
    duration: string;
    stops: number;
}

// Hotel data structure
export interface Hotel {
    id: string;
    name: string;
    rating: number;
    address: {
        street: string;
        city: string;
        postalCode: string;
    };
    location: {
        latitude: number;
        longitude: number;
    };
    contact?: {
        phone: string;
        email: string;
    };
    description: string;
    amenities: string[];
    price: {
        amount: number;
        currency: string;
    };
    images: string[];
}

// SSE Event types
export type SSEEvent =
    | { type: 'start'; data: { threadId: string } }
    | { type: 'thinking'; data: { content: string } }
    | { type: 'tool_call_start'; data: { toolName: string; args: Record<string, any>; toolCallId: string } }
    | { type: 'tool_result'; data: { toolName: string; toolCallId: string; result: any; summary?: string } }
    | { type: 'ui_component'; data: { component: string; props: Record<string, any> } }
    | { type: 'text'; data: { content: string } }
    | { type: 'token'; data: { content: string } }
    | { type: 'complete'; data: { threadId: string; response: string } }
    | { type: 'query_suggestions'; data: { suggestions: string[]; thematic: string; confidence: number } }
    | { type: 'error'; data: { error: string; details?: string } };
