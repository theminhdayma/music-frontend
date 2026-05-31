import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const backendResponse = await fetch(`${apiUrl}/music/remix/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await backendResponse.text();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: responseText || "Failed to generate remix" },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json(JSON.parse(responseText), {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Invalid remix request:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
