import { initializeTensorFlow, loadUniversalSentenceEncoder, isServer } from './tfjs-env';

interface Vector {
    id: string;
    text: string;
    embedding: number[];
    metadata?: Record<string, any>;
}

interface SearchResult {
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, any>;
}

/**
 * RAG Service - Singleton for vector search with TensorFlow.js
 * Works in both Node.js (server) and browser (client) environments
 */
class RAGService {
    private static instance: RAGService;
    private model: any = null; // UniversalSentenceEncoder model (loaded dynamically)
    private tf: any = null; // TensorFlow.js instance (loaded dynamically)
    private vectors: Vector[] = [];
    private isInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    private constructor() {}

    static getInstance(): RAGService {
        if (!RAGService.instance) {
            RAGService.instance = new RAGService();
        }
        return RAGService.instance;
    }

    /**
     * Initialize the Universal Sentence Encoder model
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('[RAG] Already initialized');
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                const env = isServer ? 'server (Node.js)' : 'client (browser)';
                console.log(`[RAG] Initializing TensorFlow.js on ${env}...`);

                // Initialize TensorFlow.js with appropriate backend
                this.tf = await initializeTensorFlow();
                console.log(`[RAG] TensorFlow.js backend ready: ${this.tf.getBackend()}`);

                console.log('[RAG] Loading Universal Sentence Encoder...');

                // Load the model (works in both environments)
                const useModule = await loadUniversalSentenceEncoder();
                this.model = await useModule.load();
                console.log('[RAG] Model loaded successfully');

                // Load vectors from Azure Table Storage
                await this.loadVectors();

                this.isInitialized = true;
                console.log(`[RAG] Initialized with ${this.vectors.length} vectors on ${env}`);
            } catch (error) {
                console.error('[RAG] Failed to initialize:', error);
                this.initPromise = null; // Reset to allow retry
                throw error;
            }
        })();

        return this.initPromise;
    }

    /**
     * Load vectors from Azure Table Storage
     */
    private async loadVectors(): Promise<void> {
        try {
            const response = await fetch('http://localhost:3000/api/vectors');
            if (!response.ok) {
                throw new Error(`Failed to fetch vectors: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.vectors = data.vectors || [];
            console.log(`[RAG] Loaded ${this.vectors.length} vectors from Azure`);
        } catch (error) {
            console.error('[RAG] Failed to load vectors:', error);
            this.vectors = [];
        }
    }

    /**
     * Perform semantic search using optimized TensorFlow.js batch operations
     * This is much faster than calculating cosine similarity one by one
     */
    async search(query: string, topK: number = 5): Promise<SearchResult[]> {
        if (!this.isInitialized || !this.model) {
            await this.initialize();
        }

        if (this.vectors.length === 0) {
            return [];
        }

        try {
            // Encode the query
            const queryEmbedding = await this.model!.embed([query]);
            const queryArray = await queryEmbedding.array();
            queryEmbedding.dispose();

            // Extract query vector (handle both tfjs and tfjs-node formats)
            const queryVector = Array.isArray(queryArray[0]) ? queryArray[0] : queryArray;

            // Filter valid vectors
            const validVectors = this.vectors.filter(
                (vector) => vector.embedding && Array.isArray(vector.embedding)
            );

            if (validVectors.length === 0) {
                return [];
            }

            // Use TensorFlow.js for batch cosine similarity calculation
            const similarities = this.tf.tidy(() => {
                // Convert query to tensor
                const queryTensor = this.tf.tensor1d(queryVector);

                // Stack all document embeddings into a 2D tensor [numDocs, embeddingDim]
                const docEmbeddings = validVectors.map(v => v.embedding);
                const docMatrix = this.tf.tensor2d(docEmbeddings);

                // Calculate cosine similarity in batch:
                // similarity = (query · docs^T) / (||query|| * ||docs||)

                // Normalize query vector
                const queryNorm = this.tf.sqrt(this.tf.sum(this.tf.square(queryTensor)));
                const queryNormalized = this.tf.div(queryTensor, queryNorm);

                // Normalize document vectors (along last axis)
                const docNorms = this.tf.sqrt(this.tf.sum(this.tf.square(docMatrix), 1, true));
                const docNormalized = this.tf.div(docMatrix, docNorms);

                // Batch dot product: [numDocs] = [numDocs, dim] · [dim, 1]
                const scores = this.tf.matMul(docNormalized, queryNormalized.expandDims(1));

                // Convert to array
                return scores.squeeze().arraySync() as number[];
            });

            // Combine scores with vector metadata
            const results = validVectors
                .map((vector, idx) => ({
                    id: vector.id,
                    text: vector.text,
                    score: Array.isArray(similarities) ? similarities[idx] : similarities,
                    metadata: vector.metadata,
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            console.log(`[RAG] Found ${results.length} results for query: "${query.substring(0, 50)}..."`);
            return results;
        } catch (error) {
            console.error('[RAG] Search error:', error);
            return [];
        }
    }

    /**
     * Calculate cosine similarity between two vectors using TensorFlow.js
     * This is more efficient than pure JavaScript, especially with GPU acceleration
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (!this.tf) {
            // Fallback to JavaScript if TensorFlow.js not loaded yet
            const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
            const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
            const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
            return dotProduct / (magnitudeA * magnitudeB);
        }

        // Use TensorFlow.js for optimized computation
        return this.tf.tidy(() => {
            const tensorA = this.tf.tensor1d(a);
            const tensorB = this.tf.tensor1d(b);

            // Dot product: sum(a * b)
            const dotProduct = this.tf.sum(this.tf.mul(tensorA, tensorB));

            // Magnitudes: sqrt(sum(a^2)) and sqrt(sum(b^2))
            const magnitudeA = this.tf.sqrt(this.tf.sum(this.tf.square(tensorA)));
            const magnitudeB = this.tf.sqrt(this.tf.sum(this.tf.square(tensorB)));

            // Cosine similarity: dot / (magA * magB)
            const similarity = this.tf.div(dotProduct, this.tf.mul(magnitudeA, magnitudeB));

            return similarity.dataSync()[0];
        });
    }

    /**
     * Tokenize text into words (simple tokenization)
     */
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

    /**
     * Calculate BM25 score for lexical search
     * BM25 is a ranking function used by search engines to estimate relevance
     * @param queryTokens - Tokenized query terms
     * @param docTokens - Tokenized document terms
     * @param avgDocLength - Average document length in corpus
     * @param k1 - Term frequency saturation parameter (default: 1.5)
     * @param b - Length normalization parameter (default: 0.75)
     */
    private calculateBM25(
        queryTokens: string[],
        docTokens: string[],
        avgDocLength: number,
        k1: number = 1.5,
        b: number = 0.75
    ): number {
        const docLength = docTokens.length;
        const termFreq = new Map<string, number>();

        // Calculate term frequencies in document
        for (const term of docTokens) {
            termFreq.set(term, (termFreq.get(term) || 0) + 1);
        }

        // Calculate IDF and BM25 score
        let score = 0;
        for (const term of queryTokens) {
            const tf = termFreq.get(term) || 0;
            if (tf === 0) continue;

            // Count documents containing this term (for IDF calculation)
            const docsWithTerm = this.vectors.filter(v =>
                this.tokenize(v.text).includes(term)
            ).length;

            // IDF: Inverse Document Frequency
            const idf = Math.log(
                (this.vectors.length - docsWithTerm + 0.5) /
                (docsWithTerm + 0.5) + 1
            );

            // BM25 formula
            const numerator = tf * (k1 + 1);
            const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

            score += idf * (numerator / denominator);
        }

        return score;
    }

    /**
     * Lexical search using BM25 algorithm
     * BM25 is better than TF-IDF for ranking documents by keyword relevance
     */
    async lexicalSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
        if (this.vectors.length === 0) {
            return [];
        }

        try {
            const queryTokens = this.tokenize(query);
            if (queryTokens.length === 0) {
                return [];
            }

            // Calculate average document length
            const avgDocLength = this.vectors.reduce((sum, v) =>
                sum + this.tokenize(v.text).length, 0
            ) / this.vectors.length;

            // Calculate BM25 scores for all documents
            const results = this.vectors
                .map((vector) => {
                    const docTokens = this.tokenize(vector.text);
                    const score = this.calculateBM25(queryTokens, docTokens, avgDocLength);

                    return {
                        id: vector.id,
                        text: vector.text,
                        score,
                        metadata: vector.metadata,
                    };
                })
                .filter(result => result.score > 0) // Only include documents with matches
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            console.log(`[RAG] Lexical search found ${results.length} results for query: "${query.substring(0, 50)}..."`);
            return results;
        } catch (error) {
            console.error('[RAG] Lexical search error:', error);
            return [];
        }
    }

    /**
     * Hybrid search combining semantic (vector) and lexical (BM25) search
     * Uses Reciprocal Rank Fusion (RRF) to merge results
     * @param query - Search query
     * @param topK - Number of results to return
     * @param alpha - Weight for semantic search (0-1, default: 0.5)
     *                alpha=1: pure semantic, alpha=0: pure lexical, alpha=0.5: balanced
     */
    async hybridSearch(
        query: string,
        topK: number = 5,
        alpha: number = 0.5
    ): Promise<SearchResult[]> {
        if (this.vectors.length === 0) {
            return [];
        }

        try {
            // Perform both searches in parallel
            const [semanticResults, lexicalResults] = await Promise.all([
                this.search(query, Math.min(topK * 2, this.vectors.length)),
                this.lexicalSearch(query, Math.min(topK * 2, this.vectors.length))
            ]);

            // Reciprocal Rank Fusion (RRF)
            // RRF is more robust than simple score averaging
            const k = 60; // RRF constant (standard value)
            const fusedScores = new Map<string, {
                score: number;
                vector: Vector;
                semanticRank: number;
                lexicalRank: number;
            }>();

            // Add semantic search results
            semanticResults.forEach((result, rank) => {
                const vector = this.vectors.find(v => v.id === result.id);
                if (!vector) return;

                fusedScores.set(result.id, {
                    score: alpha * (1 / (k + rank + 1)), // RRF score weighted by alpha
                    vector,
                    semanticRank: rank + 1,
                    lexicalRank: 0,
                });
            });

            // Add lexical search results
            lexicalResults.forEach((result, rank) => {
                const existing = fusedScores.get(result.id);
                const lexicalScore = (1 - alpha) * (1 / (k + rank + 1));

                if (existing) {
                    // Combine scores if document appears in both results
                    existing.score += lexicalScore;
                    existing.lexicalRank = rank + 1;
                } else {
                    const vector = this.vectors.find(v => v.id === result.id);
                    if (!vector) return;

                    fusedScores.set(result.id, {
                        score: lexicalScore,
                        vector,
                        semanticRank: 0,
                        lexicalRank: rank + 1,
                    });
                }
            });

            // Sort by fused score and return top K
            const results = Array.from(fusedScores.entries())
                .map(([id, data]) => ({
                    id,
                    text: data.vector.text,
                    score: data.score,
                    metadata: {
                        ...data.vector.metadata,
                        hybridInfo: {
                            semanticRank: data.semanticRank,
                            lexicalRank: data.lexicalRank,
                            fusedScore: data.score,
                        },
                    },
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            console.log(
                `[RAG] Hybrid search (α=${alpha}) found ${results.length} results ` +
                `(semantic: ${semanticResults.length}, lexical: ${lexicalResults.length})`
            );

            return results;
        } catch (error) {
            console.error('[RAG] Hybrid search error:', error);
            return [];
        }
    }

    /**
     * Add a new vector to the store
     */
    async addVector(text: string, metadata?: Record<string, any>): Promise<string> {
        if (!this.isInitialized || !this.model) {
            await this.initialize();
        }

        try {
            // Encode the text
            const embedding = await this.model!.embed([text]);
            const embeddingArray = await embedding.array();
            embedding.dispose();

            const vector: Vector = {
                id: `vec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text,
                embedding: embeddingArray[0],
                metadata,
            };

            this.vectors.push(vector);
            console.log(`[RAG] Added vector: ${vector.id}`);
            return vector.id;
        } catch (error) {
            console.error('[RAG] Failed to add vector:', error);
            throw error;
        }
    }

    /**
     * Get statistics about the vector store
     */
    getStats() {
        return {
            vectorCount: this.vectors.length,
            isInitialized: this.isInitialized,
            modelLoaded: !!this.model,
        };
    }
}

export const ragService = RAGService.getInstance();
export { RAGService };
