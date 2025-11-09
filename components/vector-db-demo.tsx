"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Loader2, Database } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
	useVectorStore,
	type SimilarityResult,
	type SearchMode,
} from "@/lib/store/vector-store";
import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import { initTfjsBackend } from "@/lib/tfjs-init";

export default function VectorDbDemo() {
	const { t } = useI18n();
	const {
		vectors,
		isModelLoaded,
		addVector,
		clearVectors,
		findSimilar,
		findLexical,
		findHybrid,
		setModelLoaded,
		loadVectorsFromAzure,
		isLoadingVectors,
	} = useVectorStore();

	const [model, setModel] = useState<use.UniversalSentenceEncoder | null>(null);
	const [input, setInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [loadingModel, setLoadingModel] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [similarResults, setSimilarResults] = useState<SimilarityResult[]>([]);
	const [searchMode, setSearchMode] = useState<SearchMode>("semantic");
	const [alpha, setAlpha] = useState(0.5);

	// Load vectors from Azure on mount
	useEffect(() => {
		if (vectors.length === 0 && !isLoadingVectors) {
			loadVectorsFromAzure().catch((err) => {
				console.warn("Could not load vectors from Azure:", err);
				// Don't set error state, Azure is optional
			});
		}
	}, [vectors.length, isLoadingVectors, loadVectorsFromAzure]);

	// Load TensorFlow.js and Universal Sentence Encoder
	useEffect(() => {
		const initModel = async () => {
			try {
				setLoadingModel(true);
				setError(null);

				// Initialize TensorFlow.js with best available backend
				await initTfjsBackend();

				// Load Universal Sentence Encoder
				const loadedModel = await use.load();
				setModel(loadedModel);
				console.log("Model loaded");
				setModelLoaded(true);
				setLoadingModel(false);
			} catch (error) {
				console.error("Error loading model:", error);
				setError("Failed to load AI model. Please refresh and try again.");
				setLoadingModel(false);
			}
		};

		if (!model) {
			initModel();
		}

		return () => {
			tf.dispose();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleAddText = async () => {
		if (!input.trim() || !isModelLoaded || !model) return;

		setIsLoading(true);
		setError(null);

		try {
			// Generate embedding
			const embeddings = await model.embed([input]);
			const embeddingArray = await embeddings.array();

			// Add to store
			addVector({
				id: Date.now().toString(),
				text: input,
				embedding: embeddingArray[0],
				timestamp: Date.now(),
			});

			// Dispose embeddings to free memory
			embeddings.dispose();

			setInput("");
			setSimilarResults([]);
		} catch (err) {
			console.error("Error generating embedding:", err);
			setError("Failed to process text. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSearch = async () => {
		if (!searchQuery.trim() || vectors.length === 0) return;

		// Lexical search doesn't need model loaded
		if (searchMode === "lexical") {
			setIsLoading(true);
			setError(null);

			try {
				const similar = findLexical(searchQuery, 3);
				setSimilarResults(similar);
			} catch (err) {
				console.error("Error searching:", err);
				setError("Failed to search. Please try again.");
			} finally {
				setIsLoading(false);
			}
			return;
		}

		// Semantic and hybrid need embeddings
		if (!isModelLoaded || !model) return;

		setIsLoading(true);
		setError(null);

		try {
			// Generate embedding for search query
			const embeddings = await model.embed([searchQuery]);
			const embeddingArray = await embeddings.array();

			// Find similar vectors based on mode
			let similar: SimilarityResult[];
			if (searchMode === "semantic") {
				similar = findSimilar(embeddingArray[0], 3);
			} else {
				// hybrid mode
				similar = findHybrid(searchQuery, embeddingArray[0], alpha, 3);
			}
			setSimilarResults(similar);

			// Dispose embeddings to free memory
			embeddings.dispose();
		} catch (err) {
			console.error("Error searching:", err);
			setError("Failed to search. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	if (loadingModel) {
		return (
			<div className="flex flex-col items-center justify-center p-8 space-y-4">
				<Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
				<div className="text-center space-y-2">
					<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
						Loading AI model (Universal Sentence Encoder)
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-500">
						Downloading ~50MB model, this may take 10-30 seconds...
					</p>
					<div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
						<p className="text-xs text-blue-700 dark:text-blue-300">
							💡 The model is cached after first load
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (error && !isModelLoaded) {
		return (
			<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
				<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				<button
					onClick={() => {
						setError(null);
						setModelLoaded(false);
						window.location.reload();
					}}
					className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium">
					Retry Loading Model
				</button>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Left Column - Input & Info */}
			<div className="space-y-4">
				{/* Info */}
				<div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
					<h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
						{t.vectorDb.howItWorks}
					</h4>
					<p className="text-xs text-purple-700 dark:text-purple-300">{t.vectorDb.desc}</p>
				</div>

				{/* Azure Status */}
				{isLoadingVectors && (
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin text-blue-500" />
						<span className="text-xs text-blue-700 dark:text-blue-300">
							Loading vectors from Azure Table Storage...
						</span>
					</div>
				)}
				{!isLoadingVectors && vectors.length > 0 && (
					<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
						<Database className="w-4 h-4 text-green-500" />
						<span className="text-xs text-green-700 dark:text-green-300">
							{vectors.length} vectors loaded from Azure
						</span>
					</div>
				)}

			{/* Add Text */}
			<div className="space-y-2">
				<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Add sentence to database:
				</label>
				<div className="flex space-x-2">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && handleAddText()}
						placeholder="Enter a sentence..."
						className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
						disabled={isLoading}
					/>
					<button
						onClick={handleAddText}
						disabled={isLoading || !input.trim()}
						className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2">
						{isLoading ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Plus className="w-4 h-4" />
						)}
						<span className="text-sm">{t.vectorDb.addText}</span>
					</button>
				</div>
			</div>

			{/* Search */}
			{vectors.length > 0 && (
				<div className="space-y-3">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
						Find similar sentences:
					</label>

					{/* Search Mode Selector */}
					<div className="space-y-2">
						<label className="text-xs font-medium text-gray-600 dark:text-gray-400">
							Search Mode:
						</label>
						<div className="flex space-x-2">
							<button
								onClick={() => setSearchMode("semantic")}
								className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
									searchMode === "semantic"
										? "bg-purple-500 text-white shadow-md"
										: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
								}`}>
								Semantic
							</button>
							<button
								onClick={() => setSearchMode("lexical")}
								className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
									searchMode === "lexical"
										? "bg-pink-500 text-white shadow-md"
										: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
								}`}>
								Lexical (BM25)
							</button>
							<button
								onClick={() => setSearchMode("hybrid")}
								className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
									searchMode === "hybrid"
										? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
										: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
								}`}>
								Hybrid
							</button>
						</div>
					</div>

					{/* Alpha Slider for Hybrid Mode */}
					{searchMode === "hybrid" && (
						<div className="space-y-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
							<div className="flex justify-between items-center">
								<label className="text-xs font-medium text-purple-700 dark:text-purple-300">
									Weight Balance:
								</label>
								<span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
									{(alpha * 100).toFixed(0)}% Semantic / {((1 - alpha) * 100).toFixed(0)}%
									Lexical
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={alpha}
								onChange={(e) => setAlpha(parseFloat(e.target.value))}
								className="w-full h-2 bg-gradient-to-r from-pink-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
							/>
							<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
								<span>More Lexical</span>
								<span>More Semantic</span>
							</div>
						</div>
					)}

					<div className="flex space-x-2">
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							placeholder="Search for similar..."
							className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
							disabled={isLoading}
						/>
						<button
							onClick={handleSearch}
							disabled={isLoading || !searchQuery.trim()}
							className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2">
							{isLoading ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Search className="w-4 h-4" />
							)}
							<span className="text-sm">{t.vectorDb.searchSimilar}</span>
						</button>
					</div>
				</div>
			)}

				{/* Error */}
				{error && isModelLoaded && (
					<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					</div>
				)}
			</div>

			{/* Right Column - Results & Database */}
			<div className="space-y-4">
				{/* Similar Results */}
			{similarResults.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Similar sentences found:
						</label>
						<button
							onClick={() => setSimilarResults([])}
							className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
							Clear results
						</button>
					</div>
					<div className="space-y-3 max-h-64 overflow-y-auto">
						{similarResults.map((result, idx) => {
							// Calculate similarity percentage and color
							const similarityPercent = (result.similarity * 100).toFixed(1);
							const similarityColor =
								result.similarity > 0.8
									? "bg-green-500"
									: result.similarity > 0.6
									? "bg-yellow-500"
									: "bg-orange-500";

							return (
								<div
									key={`${result.id}-${idx}`}
									className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:shadow-md transition-shadow">
									<div className="flex items-start justify-between mb-2">
										<span className="text-xs font-bold text-purple-600 dark:text-purple-400">
											#{idx + 1}
										</span>
										<div className="flex items-center space-x-2">
											<div
												className={`w-2 h-2 rounded-full ${similarityColor}`}
											/>
											<span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
												{similarityPercent}% match
											</span>
										</div>
									</div>
									<p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
										{result.text}
									</p>

									{/* Score Breakdown */}
									<div className="mt-3 space-y-2">
										{/* Overall Score */}
										<div className="pt-2 border-t border-purple-200 dark:border-purple-700">
											<div className="flex justify-between items-center mb-1">
												<span className="text-xs font-medium text-gray-600 dark:text-gray-400">
													Overall Score:
												</span>
												<span className="text-xs font-bold text-purple-700 dark:text-purple-300">
													{similarityPercent}%
												</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
												<div
													className={`h-1.5 rounded-full ${similarityColor}`}
													style={{ width: `${similarityPercent}%` }}
												/>
											</div>
										</div>

										{/* Detailed Scores for Hybrid */}
										{searchMode === "hybrid" &&
											result.semanticScore !== undefined &&
											result.lexicalScore !== undefined && (
												<div className="space-y-1.5 text-xs">
													<div className="flex justify-between items-center">
														<span className="text-purple-600 dark:text-purple-400">
															→ Semantic:
														</span>
														<span className="font-semibold">
															{(result.semanticScore * 100).toFixed(1)}%
														</span>
													</div>
													<div className="flex justify-between items-center">
														<span className="text-pink-600 dark:text-pink-400">
															→ Lexical:
														</span>
														<span className="font-semibold">
															{(result.lexicalScore * 100).toFixed(1)}%
														</span>
													</div>
												</div>
											)}

										{/* Show which score type for single mode */}
										{searchMode === "semantic" && result.semanticScore !== undefined && (
											<div className="text-xs text-purple-600 dark:text-purple-400">
												Semantic similarity (cosine)
											</div>
										)}
										{searchMode === "lexical" && result.lexicalScore !== undefined && (
											<div className="text-xs text-pink-600 dark:text-pink-400">
												Lexical match (BM25)
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Stored Vectors */}
			{vectors.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Database ({vectors.length} entries):
						</label>
						<button
							onClick={clearVectors}
							className="text-xs text-red-500 hover:text-red-600 flex items-center space-x-1">
							<Trash2 className="w-3 h-3" />
							<span>Clear All</span>
						</button>
					</div>
					<div className="space-y-2 max-h-48 overflow-y-auto">
						{vectors.map((vector, idx) => (
							<div
								key={`${vector.id}-${idx}`}
								className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
								<p className="text-sm text-gray-800 dark:text-gray-200">{vector.text}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Vector dimension: {vector.embedding.length}
								</p>
							</div>
						))}
					</div>
				</div>
			)}

				{vectors.length === 0 && !similarResults.length && (
					<div className="text-center py-12 text-gray-500 dark:text-gray-400">
						<Database className="w-16 h-16 mx-auto mb-3 opacity-50" />
						<p className="text-sm font-medium mb-1">
							No data yet
						</p>
						<p className="text-xs">
							Add sentences to the database to see results here
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
