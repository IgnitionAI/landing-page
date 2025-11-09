import { create } from "zustand";
import * as tf from "@tensorflow/tfjs";

export interface VectorEntry {
	id: string;
	text: string;
	embedding: number[];
	timestamp: number;
}

export interface SimilarityResult extends VectorEntry {
	similarity: number;
	lexicalScore?: number;
	semanticScore?: number;
	hybridScore?: number;
}

export type SearchMode = "semantic" | "lexical" | "hybrid";

interface AzureVectorEntity {
	id: string;
	text: string;
	vector: number[];
	timestamp: string;
}

interface VectorStore {
	vectors: VectorEntry[];
	isModelLoaded: boolean;
	isLoadingVectors: boolean;
	addVector: (entry: VectorEntry) => void;
	removeVector: (id: string) => void;
	clearVectors: () => void;
	setModelLoaded: (loaded: boolean) => void;
	loadVectorsFromAzure: () => Promise<void>;
	findSimilar: (queryEmbedding: number[], topK?: number) => SimilarityResult[];
	findLexical: (queryText: string, topK?: number) => SimilarityResult[];
	findHybrid: (
		queryText: string,
		queryEmbedding: number[],
		alpha?: number,
		topK?: number
	) => SimilarityResult[];
}

// Batch cosine similarity for multiple vectors using TensorFlow.js
// This is much more efficient than computing similarities one by one
function batchCosineSimilarity(
	query: number[],
	vectors: number[][]
): number[] {
	return tf.tidy(() => {
		const queryTensor = tf.tensor1d(query);
		const vectorsTensor = tf.tensor2d(vectors);

		// Normalize query
		const queryNorm = tf.norm(queryTensor);
		const normalizedQuery = tf.div(queryTensor, queryNorm);

		// Normalize all vectors
		const vectorNorms = tf.norm(vectorsTensor, 2, 1, true);
		const normalizedVectors = tf.div(vectorsTensor, vectorNorms);

		// Compute dot products (cosine similarity for normalized vectors)
		const queryReshaped = tf.expandDims(normalizedQuery, 1);
		const similarities = tf.matMul(
			normalizedVectors,
			queryReshaped
		);

		return Array.from(similarities.dataSync());
	});
}

// Tokenization function (simple word-based)
function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 0);
}

// BM25 scoring function (lexical)
function bm25Score(
	queryTokens: string[], // Query tokens
	docTokens: string[], // Document tokens
	avgDocLength: number, // Average document length
	k1 = 1.5, // k1 is a parameter that controls the impact of term frequency
	b = 0.75 // b is a parameter that controls the impact of document length
): number {
	const docLength = docTokens.length;
	const termFrequency: Record<string, number> = {};

	// Count term frequencies in document
	docTokens.forEach((token) => {
		termFrequency[token] = (termFrequency[token] || 0) + 1;
	});

	let score = 0;

	queryTokens.forEach((term) => {
		const tf = termFrequency[term] || 0;
		if (tf > 0) {
			// Simplified BM25 formula (without IDF for single document scoring)
			const numerator = tf * (k1 + 1);
			const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
			score += numerator / denominator;
		}
	});

	return score;
}

// Normalize scores to 0-1 range
function normalizeScores(scores: number[]): number[] {
	const scoresTensor = tf.tensor(scores);
	const maxValue = tf.max(scoresTensor).dataSync()[0];
	const normalizedMax = maxValue + 0.0001; // Avoid division by zero
	return scores.map((s) => s / normalizedMax);
}

export const useVectorStore = create<VectorStore>((set, get) => ({
	vectors: [],
	isModelLoaded: false,
	isLoadingVectors: false,

	addVector: (entry) =>
		set((state) => ({
			vectors: [...state.vectors, entry],
		})),

	removeVector: (id) =>
		set((state) => ({
			vectors: state.vectors.filter((v) => v.id !== id),
		})),

	clearVectors: () =>
		set({
			vectors: [],
		}),

	setModelLoaded: (loaded) =>
		set({
			isModelLoaded: loaded,
		}),

	loadVectorsFromAzure: async () => {
		set({ isLoadingVectors: true });
		try {
			// Call API route instead of direct Azure access (for security)
			const response = await fetch("/api/vectors");
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			
			if (!data.success) {
				throw new Error(data.error || "Failed to fetch vectors");
			}

			// Transform Azure entities to VectorEntry format
			const vectors: VectorEntry[] = data.vectors.map((entity: AzureVectorEntity) => ({
				id: entity.id,
				text: entity.text,
				embedding: entity.vector,
				timestamp: new Date(entity.timestamp).getTime(),
			}));

			set({ vectors, isLoadingVectors: false });
			console.log(`Loaded ${vectors.length} vectors from Azure Table Storage`);
		} catch (error) {
			console.error("Failed to load vectors from Azure:", error);
			set({ isLoadingVectors: false });
		}
	},

	findSimilar: (queryEmbedding, topK = 5) => {
		const { vectors } = get();

		if (vectors.length === 0) return [];

		// Use batch computation for better performance
		const embeddings = vectors.map((v) => v.embedding);
		const similarities = batchCosineSimilarity(queryEmbedding, embeddings);

		// Combine with vector data
		const results = vectors.map((vector, idx) => ({
			...vector,
			similarity: similarities[idx],
			semanticScore: similarities[idx],
		}));

		// Sort by similarity (descending) and return top K with similarity scores
		return results
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, Math.min(topK, results.length));
	},

	findLexical: (queryText, topK = 5) => {
		const { vectors } = get();

		if (vectors.length === 0) return [];

		// Tokenize query
		const queryTokens = tokenize(queryText);

		// Calculate average document length
		const avgDocLength =
			vectors.reduce((sum, v) => sum + tokenize(v.text).length, 0) /
			vectors.length;

		// Calculate BM25 scores for all vectors
		const scores = vectors.map((vector) => {
			const docTokens = tokenize(vector.text);
			return bm25Score(queryTokens, docTokens, avgDocLength);
		});

		// Normalize scores to 0-1 range
		const normalizedScores = normalizeScores(scores);

		// Combine with vectors
		const results = vectors.map((vector, idx) => ({
			...vector,
			similarity: normalizedScores[idx],
			lexicalScore: normalizedScores[idx],
		}));

		// Sort by score (descending) and return top K
		return results
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, Math.min(topK, results.length));
	},

	findHybrid: (queryText, queryEmbedding, alpha = 0.5, topK = 5) => {
		const { vectors } = get();

		if (vectors.length === 0) return [];

		// Tokenize query
		const queryTokens = tokenize(queryText);

		// Calculate average document length
		const avgDocLength =
			vectors.reduce((sum, v) => sum + tokenize(v.text).length, 0) /
			vectors.length;

		// Use batch computation for semantic scores
		const embeddings = vectors.map((v) => v.embedding);
		const semanticScores = batchCosineSimilarity(queryEmbedding, embeddings);

		// Calculate both semantic and lexical scores
		const results = vectors.map((vector, idx) => {
			const docTokens = tokenize(vector.text);
			const lexicalRawScore = bm25Score(queryTokens, docTokens, avgDocLength);

			return {
				...vector,
				semanticScore: semanticScores[idx],
				lexicalRawScore,
			};
		});

		// Normalize lexical scores
		const lexicalScores = results.map((r) => r.lexicalRawScore);
		const normalizedLexicalScores = normalizeScores(lexicalScores);

		// Combine scores with alpha weighting
		const hybridResults = results.map((result, idx) => {
			const lexicalScore = normalizedLexicalScores[idx];
			const hybridScore = alpha * result.semanticScore + (1 - alpha) * lexicalScore;

			return {
				...result,
				lexicalScore,
				hybridScore,
				similarity: hybridScore,
			};
		});

		// Sort by hybrid score (descending) and return top K
		return hybridResults
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, Math.min(topK, hybridResults.length))
			//disable linting for lexicalRawScore because it is destructured so it is not used
			// eslint-disable-next-line @typescript-eslint/no-unused-vars 
			.map(({ lexicalRawScore, ...rest }) => rest); // Remove temporary field
	},
}));
