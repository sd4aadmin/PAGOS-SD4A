import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ detail: "No autorizado" }, { status: 401 });

  const { path } = await params;
  const apiPath = path.join("/");
  const search = req.nextUrl.search;
  const url = `${API_URL}/api/v1/${apiPath}${search}`;

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const isDownload = apiPath.startsWith("files/download/") || apiPath.startsWith("files/preview/") || apiPath.includes("/download");

  let body: BodyInit | undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (isMultipart) {
      // Pass FormData as-is — do NOT set Content-Type (fetch sets boundary automatically)
      body = await req.blob();
      headers["Content-Type"] = contentType;
    } else {
      body = await req.text();
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, { method: req.method, headers, body });

  // For file downloads/previews return raw binary
  if (isDownload && res.ok) {
    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") ?? "";
    const headers: Record<string, string> = {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": disposition,
    };
    const limited = res.headers.get("x-preview-limited");
    if (limited !== null) headers["X-Preview-Limited"] = limited;
    return new NextResponse(blob, { status: res.status, headers });
  }

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
