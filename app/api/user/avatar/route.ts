import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "未配置" }, { status: 500 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    if (!file || !userId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

    // Validate
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "文件不能超过2MB" }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG/PNG/WebP/GIF" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${userId}.${ext}`;

    // Upload to Supabase Storage
    const uploadRes = await fetch(`${url}/storage/v1/object/avatars/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: await file.arrayBuffer(),
    });

    if (!uploadRes.ok) {
      // Storage bucket might not exist - try to create it
      if (uploadRes.status === 400 || uploadRes.status === 404) {
        // Create bucket
        await fetch(`${url}/storage/v1/bucket`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
          body: JSON.stringify({ id: "avatars", name: "avatars", public: true }),
        });
        // Retry upload
        const retry = await fetch(`${url}/storage/v1/object/avatars/${path}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": file.type, "x-upsert": "true" },
          body: await file.arrayBuffer(),
        });
        if (!retry.ok) throw new Error("Upload failed after bucket creation");
      } else {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }
    }

    const publicUrl = `${url}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
