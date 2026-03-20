import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { saveFile } from "@/lib/upload";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const subdir = (formData.get("subdir") as string) ?? "general";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const url = await saveFile(file, subdir);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
