import { TableClient } from "@azure/data-tables";
import { z } from "zod";

// Validation schemas
const VectorEntitySchema = z.object({
	partitionKey: z.string(),
	rowKey: z.string(),
	timestamp: z.string(),
	vector: z.string(),
	text: z.string(),
	etag: z.string().optional(),
});

const FormattedVectorEntitySchema = z.object({
	id: z.string(),
	category: z.string(),
	timestamp: z.string(),
	vector: z.array(z.number()),
	text: z.string(),
});

type VectorEntity = z.infer<typeof VectorEntitySchema>;
type FormattedVectorEntity = z.infer<typeof FormattedVectorEntitySchema>;

// Lazy initialization to avoid errors when env vars are not set
let tableClient: TableClient | null = null;

function getTableClient(): TableClient {
	if (tableClient) return tableClient;

	const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
	const tableName = process.env.AZURE_STORAGE_TABLE_NAME;

	if (!connectionString || !tableName) {
		throw new Error(
			"Missing Azure Table Storage configuration. Please set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_TABLE_NAME in .env.local"
		);
	}

	tableClient = TableClient.fromConnectionString(connectionString, tableName);
	return tableClient;
}

export async function getAllVectorsInTable(): Promise<FormattedVectorEntity[]> {
	try {
		const client = getTableClient();
		const entities: FormattedVectorEntity[] = [];
		const iterator = client.listEntities<VectorEntity>();

		for await (const entity of iterator) {
			try {
				// Validate entity structure
				const validatedEntity = VectorEntitySchema.parse(entity);

				// Parse vector string to number array
				const vectorArray = validatedEntity.vector
					.split(",")
					.map((num) => parseFloat(num.trim()))
					.filter((num) => !isNaN(num));

				if (vectorArray.length === 0) {
					console.warn(`Skipping entity ${validatedEntity.rowKey}: invalid vector data`);
					continue;
				}

				const formattedEntity: FormattedVectorEntity = {
					id: validatedEntity.rowKey,
					category: validatedEntity.partitionKey,
					timestamp: validatedEntity.timestamp,
					vector: vectorArray,
					text: validatedEntity.text || validatedEntity.rowKey,
				};

				// Validate formatted entity
				FormattedVectorEntitySchema.parse(formattedEntity);
				entities.push(formattedEntity);
			} catch (entityError) {
				console.warn(`Failed to process entity:`, entityError);
				continue;
			}
		}

		console.log(`Successfully fetched ${entities.length} vectors from Azure Table Storage`);
		return entities;
	} catch (error) {
		console.error("Error fetching entities from Azure Table Storage:", error);
		throw new Error(
			`Failed to fetch vectors from Azure: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}