import { NextResponse } from "next/server";
import { getAllVectorsInTable } from "@/service/azure-table.service";

export async function GET() {
	try {
		const vectors = await getAllVectorsInTable();
		return NextResponse.json({ vectors, success: true });
	} catch (error) {
		console.error("API Error fetching vectors:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to fetch vectors",
				success: false,
			},
			{ status: 500 }
		);
	}
}
