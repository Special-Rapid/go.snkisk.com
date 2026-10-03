interface VerifiedImage {
  url: string;
  bytes: number;
  sha256: string;
  mime: "image/jpeg";
}

// Original JPEG: go.snkisk.com@53b414a5cc4edc2f21ecfa1695612c5851b495cb,
// src/index.ts SHARE_PREVIEW_AMBER_WAVES. CDN bytes verified by the owner.
export const SHARE_PREVIEW_ASSET: Readonly<VerifiedImage> = {
  url: "https://images.snkisk.com/go.snkisk.com/images/fdfe80cf-dd14-4f32-aea6-bdaa1f186c4d.jpg",
  bytes: 49793,
  sha256: "84c1f7f85353149c5c45855695e6157112e995674610709f9e3440761d0191a6",
  mime: "image/jpeg",
};

export async function proxyVerifiedImage(asset: Readonly<VerifiedImage>): Promise<Response> {
  try {
    const url = new URL(asset.url);
    if (url.origin !== "https://images.snkisk.com" || url.username || url.password || url.search || url.hash
      || !/^\/go\.snkisk\.com\/images\/[a-f0-9-]+\.jpg$/.test(url.pathname)
      || !Number.isSafeInteger(asset.bytes) || asset.bytes < 3 || asset.bytes > 99000000
      || !/^[a-f0-9]{64}$/.test(asset.sha256) || asset.mime !== "image/jpeg") throw new Error("Invalid static image mapping");

    const upstream = await fetch(url.href, {
      // Workers support manual redirects; the 200 check below rejects every 3xx.
      redirect: "manual", signal: AbortSignal.timeout(10000),
      headers: { Accept: asset.mime },
    });
    if (upstream.status !== 200 || upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== asset.mime
      || !upstream.body) {
      await upstream.body?.cancel();
      throw new Error("Static image status/MIME mismatch");
    }

    const reader = upstream.body.getReader();
    const bytes = new Uint8Array(asset.bytes);
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (length + value.length > bytes.length) throw new Error("Static image exceeds pinned size");
        bytes.set(value, length);
        length += value.length;
      }
    } finally {
      await reader.cancel();
    }
    if (length !== asset.bytes || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("Static image size/signature mismatch");
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const sha256 = Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
    if (sha256 !== asset.sha256) throw new Error("Static image digest mismatch");

    return new Response(bytes, { headers: {
      "content-type": asset.mime,
      "cache-control": "public, max-age=31536000, immutable",
    } });
  } catch {
    return new Response("Image temporarily unavailable", { status: 502, headers: {
      "content-type": "text/plain; charset=utf-8", "cache-control": "no-store",
    } });
  }
}
