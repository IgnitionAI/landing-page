import * as dotenv from "dotenv";
dotenv.config();

class Config {
    openai_api_key: string = "";
    have_openai_api_key: boolean = false;
    have_model: boolean = false;
    llm_name: string = "gpt-4.1-mini";
    amadeus_bearer_token: string = "";
    have_amadeus_bearer_token: boolean = false;
    amadeus_url: string = "";
    have_amadeus_url: boolean = false;
    nutrition_url: string = "";
    have_nutrition_url: boolean = false;

    constructor() {
        this.init();
    }

    populate(name: string): string {
        return process.env[name] || "";
    }

    apiKeyExists(name: string): boolean {
        return this.populate(name) !== "";
    }

    init() {
        this.have_openai_api_key = this.apiKeyExists("OPENAI_API_KEY");
        this.have_model = this.apiKeyExists("LLM_NAME");
        this.openai_api_key = this.populate("OPENAI_API_KEY");
        this.llm_name = this.populate("LLM_NAME");
        this.have_amadeus_bearer_token = this.apiKeyExists("AMADEUS_BEARER_TOKEN");
        this.amadeus_bearer_token = this.populate("AMADEUS_BEARER_TOKEN");
        this.have_amadeus_url = this.apiKeyExists("AMADEUS_URL");
        this.amadeus_url = this.populate("AMADEUS_URL");
        this.have_nutrition_url = this.apiKeyExists("NUTRITION_URL");
        this.nutrition_url = this.populate("NUTRITION_URL");
    }
}

export const config = new Config();