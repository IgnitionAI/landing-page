"use client";

import { useVectorLoader } from "@/lib/hooks/use-vector-loader";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface VectorLoaderStatusProps {
	autoLoad?: boolean;
	showDetails?: boolean;
}

/**
 * Component to display the status of vector loading from Azure Table Storage
 */
export function VectorLoaderStatus({
	autoLoad = true,
	showDetails = true,
}: VectorLoaderStatusProps) {
	const { isLoading, error, loadVectors, vectorCount, hasVectors } =
		useVectorLoader(autoLoad);

	if (!showDetails && !isLoading && !error) {
		return null;
	}

	return (
		<div className="flex items-center gap-2 text-sm">
			{isLoading && (
				<>
					<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
					<span className="text-muted-foreground">Loading vectors...</span>
				</>
			)}

			{!isLoading && hasVectors && (
				<>
					<CheckCircle2 className="h-4 w-4 text-green-500" />
					<span className="text-muted-foreground">
						{vectorCount} vectors loaded
					</span>
				</>
			)}

			{!isLoading && error && (
				<>
					<AlertCircle className="h-4 w-4 text-red-500" />
					<span className="text-red-500">{error}</span>
					<button
						onClick={loadVectors}
						className="ml-2 text-xs underline hover:no-underline"
					>
						Retry
					</button>
				</>
			)}

			{!isLoading && !hasVectors && !error && (
				<>
					<AlertCircle className="h-4 w-4 text-yellow-500" />
					<span className="text-muted-foreground">No vectors loaded</span>
					<button
						onClick={loadVectors}
						className="ml-2 text-xs underline hover:no-underline"
					>
						Load now
					</button>
				</>
			)}
		</div>
	);
}
