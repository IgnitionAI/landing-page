import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { config } from "../../config";

class MCPService {
  private static instance: MCPService;
  private client: MultiServerMCPClient;
  private toolsCache: Awaited<ReturnType<MultiServerMCPClient["getTools"]>> | null = null;

  private constructor() {
    this.client = new MultiServerMCPClient({
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
  }

  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  public getClient(): MultiServerMCPClient {
    return this.client;
  }

  public async getTools() {
    if (!this.toolsCache) {
      this.toolsCache = await this.client.getTools();
    }
    return this.toolsCache;
  }
}

export const mcpService = MCPService.getInstance();
