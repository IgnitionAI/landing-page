import { useEffect, useState } from "react";
import { useVectorStore } from "@/lib/store/vector-store";

/**
 * Hook to automatically load vectors from Azure Table Storage on mount
 * @param autoLoad - Whether to automatically load vectors on mount (default: true)
 * @returns Loading state and manual load function
 */
export function useVectorLoader(autoLoad = true) {
	const { loadVectorsFromAzure, isLoadingVectors, vectors } = useVectorStore();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (autoLoad && vectors.length === 0 && !isLoadingVectors) {
			loadVectors();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoLoad]);

	const loadVectors = async () => {
		try {
			setError(null);
			await loadVectorsFromAzure();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load vectors";
			setError(errorMessage);
			console.error("Vector loading error:", err);
		}
	};

	return {
		isLoading: isLoadingVectors,
		error,
		loadVectors,
		vectorCount: vectors.length,
		hasVectors: vectors.length > 0,
	};
}
