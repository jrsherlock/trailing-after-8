import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getComebackData, getFreshComebackData } from "@/lib/mlb";

export async function GET() {
  try {
    const data = await getComebackData();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load MLB data" },
      { status: 502 },
    );
  }
}

// Manual refresh: recompute from the live MLB API and invalidate the shared cache.
export async function POST() {
  try {
    const data = await getFreshComebackData();
    revalidateTag("mlb-data", "max");
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to refresh MLB data" },
      { status: 502 },
    );
  }
}
