import { ragService } from './rag-service';
import { promptEnhancer, type EnhancedQuery, type Thematic } from './prompt-enhancer';

export interface AdvancedSearchOptions {
    topK?: number;
    enableEnhancement?: boolean;
    thematic?: Thematic;
    alpha1?: number; // For first hybrid search (default: 0.3, lexical-heavy)
    alpha2?: number; // For second hybrid search (default: 0.7, semantic-heavy)
    enableReranking?: boolean;
}

export interface AdvancedSearchResult {
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, any>;
    // Detailed scoring information
    scores: {
        finalScore: number;
        rerankScore?: number;
        fusedScore: number;
        sourceScores: {
            hybrid1?: number;
            hybrid2?: number;
            semantic?: number;
        };
        ranks: {
            hybrid1?: number;
            hybrid2?: number;
            semantic?: number;
        };
    };
    // Query that retrieved this result
    retrievedBy: string[];
}

interface RawResult {
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, any>;
}

/**
 * Advanced Retrieval System
 *
 * Implements a sophisticated RAG pipeline with:
 * 1. Query enhancement via LLM (3 variations per query)
 * 2. Multi-query parallel retrieval (3 strategies × 3 queries = 9 searches)
 * 3. RRF fusion and deduplication
 * 4. Semantic reranking for final ordering
 */
export class AdvancedRetrieval {
    private static instance: AdvancedRetrieval;

    private constructor() {}

    static getInstance(): AdvancedRetrieval {
        if (!AdvancedRetrieval.instance) {
            AdvancedRetrieval.instance = new AdvancedRetrieval();
        }
        return AdvancedRetrieval.instance;
    }

    /**
     * Perform advanced search with enhancement, multi-query, and reranking
     */
    async advancedSearch(
        query: string,
        options: AdvancedSearchOptions = {}
    ): Promise<AdvancedSearchResult[]> {
        const {
            topK = 5,
            enableEnhancement = true,
            thematic,
            alpha1 = 0.3,
            alpha2 = 0.7,
            enableReranking = true,
        } = options;

        console.log(`[AdvancedRetrieval] Starting search for: "${query}"`);
        console.log(`[AdvancedRetrieval] Options:`, {
            topK,
            enableEnhancement,
            thematic,
            alpha1,
            alpha2,
            enableReranking,
        });

        // Step 1: Query Enhancement
        let queries: string[];
        let enhancedQuery: EnhancedQuery | null = null;

        if (enableEnhancement) {
            enhancedQuery = await promptEnhancer.enhanceQuery(query, thematic);
            queries = [query, ...enhancedQuery.variations]; // Original + 3 variations = 4 queries
            console.log(`[AdvancedRetrieval] Enhanced to ${queries.length} queries`);
        } else {
            queries = [query];
            console.log(`[AdvancedRetrieval] Using single query (enhancement disabled)`);
        }

        // Step 2: Multi-Query Parallel Retrieval
        const startRetrieval = Date.now();
        const allResults = await this.multiQueryRetrieval(queries, topK * 2, alpha1, alpha2);
        const retrievalTime = Date.now() - startRetrieval;
        console.log(`[AdvancedRetrieval] Retrieved ${allResults.length} raw results in ${retrievalTime}ms`);

        // Step 3: Fusion & Deduplication
        const startFusion = Date.now();
        const fusedResults = this.fuseResults(allResults);
        const fusionTime = Date.now() - startFusion;
        console.log(`[AdvancedRetrieval] Fused to ${fusedResults.length} unique results in ${fusionTime}ms`);

        // Step 4: Semantic Reranking
        let finalResults: AdvancedSearchResult[];

        if (enableReranking && fusedResults.length > 0) {
            const startRerank = Date.now();
            finalResults = await this.semanticRerank(query, fusedResults, topK);
            const rerankTime = Date.now() - startRerank;
            console.log(`[AdvancedRetrieval] Reranked to top ${finalResults.length} in ${rerankTime}ms`);
        } else {
            finalResults = fusedResults
                .sort((a, b) => b.scores.fusedScore - a.scores.fusedScore)
                .slice(0, topK);
            console.log(`[AdvancedRetrieval] Skipped reranking, returning top ${finalResults.length}`);
        }

        console.log(`[AdvancedRetrieval] Final results:`, finalResults.map(r => ({
            id: r.id,
            finalScore: r.scores.finalScore.toFixed(4),
            fusedScore: r.scores.fusedScore.toFixed(4),
        })));

        return finalResults;
    }

    /**
     * Execute multiple searches in parallel with different strategies
     */
    private async multiQueryRetrieval(
        queries: string[],
        topK: number,
        alpha1: number,
        alpha2: number
    ): Promise<Array<RawResult & { strategy: string; queryIndex: number; rank: number }>> {
        const allSearches: Promise<any>[] = [];

        // For each query, execute 3 parallel searches
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];

            // Strategy 1: Hybrid lexical-heavy (α=0.3)
            allSearches.push(
                ragService.hybridSearch(query, topK, alpha1).then(results =>
                    results.map((r, rank) => ({
                        ...r,
                        strategy: 'hybrid1',
                        queryIndex: i,
                        rank: rank + 1,
                    }))
                )
            );

            // Strategy 2: Hybrid semantic-heavy (α=0.7)
            allSearches.push(
                ragService.hybridSearch(query, topK, alpha2).then(results =>
                    results.map((r, rank) => ({
                        ...r,
                        strategy: 'hybrid2',
                        queryIndex: i,
                        rank: rank + 1,
                    }))
                )
            );

            // Strategy 3: Pure semantic
            allSearches.push(
                ragService.search(query, topK).then(results =>
                    results.map((r, rank) => ({
                        ...r,
                        strategy: 'semantic',
                        queryIndex: i,
                        rank: rank + 1,
                    }))
                )
            );
        }

        // Execute all searches in parallel
        const allResults = await Promise.all(allSearches);

        // Flatten results
        return allResults.flat();
    }

    /**
     * Fuse and deduplicate results using Reciprocal Rank Fusion (RRF)
     */
    private fuseResults(
        results: Array<RawResult & { strategy: string; queryIndex: number; rank: number }>
    ): AdvancedSearchResult[] {
        const k = 60; // RRF constant
        const resultMap = new Map<string, {
            doc: RawResult;
            scores: Map<string, number>;
            ranks: Map<string, number>;
            retrievedBy: Set<string>;
        }>();

        // Aggregate scores and ranks by document ID
        for (const result of results) {
            const key = `${result.strategy}_q${result.queryIndex}`;

            if (!resultMap.has(result.id)) {
                resultMap.set(result.id, {
                    doc: result,
                    scores: new Map(),
                    ranks: new Map(),
                    retrievedBy: new Set(),
                });
            }

            const entry = resultMap.get(result.id)!;

            // RRF score: 1 / (k + rank)
            const rrfScore = 1 / (k + result.rank);

            // Accumulate score for this strategy
            const currentScore = entry.scores.get(result.strategy) || 0;
            entry.scores.set(result.strategy, currentScore + rrfScore);

            // Keep best (lowest) rank for this strategy
            const currentRank = entry.ranks.get(result.strategy);
            if (currentRank === undefined || result.rank < currentRank) {
                entry.ranks.set(result.strategy, result.rank);
            }

            entry.retrievedBy.add(key);
        }

        // Convert to final results
        const fusedResults: AdvancedSearchResult[] = [];

        for (const [id, entry] of resultMap.entries()) {
            // Calculate fused score (sum of all RRF scores)
            let fusedScore = 0;
            for (const score of entry.scores.values()) {
                fusedScore += score;
            }

            // Extract strategy scores
            const sourceScores: any = {};
            const ranks: any = {};

            if (entry.scores.has('hybrid1')) {
                sourceScores.hybrid1 = entry.scores.get('hybrid1');
                ranks.hybrid1 = entry.ranks.get('hybrid1');
            }
            if (entry.scores.has('hybrid2')) {
                sourceScores.hybrid2 = entry.scores.get('hybrid2');
                ranks.hybrid2 = entry.ranks.get('hybrid2');
            }
            if (entry.scores.has('semantic')) {
                sourceScores.semantic = entry.scores.get('semantic');
                ranks.semantic = entry.ranks.get('semantic');
            }

            fusedResults.push({
                id,
                text: entry.doc.text,
                score: fusedScore,
                metadata: entry.doc.metadata,
                scores: {
                    finalScore: fusedScore, // Will be updated by reranking
                    fusedScore,
                    sourceScores,
                    ranks,
                },
                retrievedBy: Array.from(entry.retrievedBy),
            });
        }

        return fusedResults;
    }

    /**
     * Rerank results using semantic similarity to the original query
     */
    private async semanticRerank(
        query: string,
        results: AdvancedSearchResult[],
        topK: number
    ): Promise<AdvancedSearchResult[]> {
        if (results.length === 0) {
            return [];
        }

        try {
            // Get query embedding
            const model = (ragService as any).model;
            if (!model) {
                console.warn('[AdvancedRetrieval] Model not available for reranking, using fusion scores');
                return results.slice(0, topK);
            }

            const queryEmbedding = await model.embed([query]);
            const queryArray = await queryEmbedding.array();
            queryEmbedding.dispose();

            const queryVector = Array.isArray(queryArray[0]) ? queryArray[0] : queryArray;

            // Calculate similarity to query for each result
            for (const result of results) {
                const vector = (ragService as any).vectors.find((v: any) => v.id === result.id);

                if (vector && vector.embedding) {
                    // Use TensorFlow.js for cosine similarity
                    const tf = (ragService as any).tf;
                    if (tf) {
                        const similarity = tf.tidy(() => {
                            const tensorA = tf.tensor1d(queryVector);
                            const tensorB = tf.tensor1d(vector.embedding);

                            const dotProduct = tf.sum(tf.mul(tensorA, tensorB));
                            const magnitudeA = tf.sqrt(tf.sum(tf.square(tensorA)));
                            const magnitudeB = tf.sqrt(tf.sum(tf.square(tensorB)));

                            const sim = tf.div(dotProduct, tf.mul(magnitudeA, magnitudeB));
                            return sim.dataSync()[0];
                        });

                        result.scores.rerankScore = similarity;

                        // Final score: weighted combination of fusion and rerank
                        // 70% rerank (semantic similarity to query) + 30% fusion (multi-strategy)
                        result.scores.finalScore = 0.7 * similarity + 0.3 * result.scores.fusedScore;
                    } else {
                        // Fallback: use fusion score
                        result.scores.rerankScore = result.scores.fusedScore;
                        result.scores.finalScore = result.scores.fusedScore;
                    }
                } else {
                    // No embedding found, use fusion score
                    result.scores.rerankScore = result.scores.fusedScore;
                    result.scores.finalScore = result.scores.fusedScore;
                }
            }

            // Sort by final score and return top K
            return results
                .sort((a, b) => b.scores.finalScore - a.scores.finalScore)
                .slice(0, topK);

        } catch (error) {
            console.error('[AdvancedRetrieval] Reranking error:', error);
            // Fallback to fusion scores
            return results
                .sort((a, b) => b.scores.fusedScore - a.scores.fusedScore)
                .slice(0, topK);
        }
    }
}

export const advancedRetrieval = AdvancedRetrieval.getInstance();
