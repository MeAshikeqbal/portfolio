import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const abouts = await client.fetch(`*[_type == "abouts"]`);
    return NextResponse.json(abouts);
  } catch (error) {
    console.error("Error fetching abouts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
