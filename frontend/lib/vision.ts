// Type-only import: erased at runtime, safe for SSR
import type { CustomMobileNet } from "@teachablemachine/image";

let model: CustomMobileNet | null = null;
const MODEL_URL = "/model/";

export async function loadVisionModel(): Promise<CustomMobileNet | null> {
  if (model) return model;
  try {
    // Dynamic import at runtime to avoid SSR/build failures (TF.js needs browser APIs)
    const tmImage = await import("@teachablemachine/image");
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    return model;
  } catch (e) {
    console.error("Error loading vision model:", e);
    return null;
  }
}

export async function scanBatikImage(
  imageElement: HTMLImageElement,
): Promise<string> {
  if (!model) {
    await loadVisionModel();
  }

  if (!model) {
    return "Sistem Visi Komputer tidak tersedia (Model tidak ditemukan).";
  }

  try {
    const predictions = await model.predict(imageElement);

    if (predictions && predictions.length > 0) {
      // Sort by probability descending
      const sorted = [...predictions].sort(
        (a, b) => b.probability - a.probability,
      );
      const best = sorted[0];

      if (best.probability > 0.25) {
        const topResults = sorted
          .filter((p) => p.probability > 0.05)
          .slice(0, 3)
          .map((p) => `${p.className} (${(p.probability * 100).toFixed(1)}%)`)
          .join(", ");
        return `Sistem Visi Komputer berhasil mendeteksi: **${best.className}** dengan keyakinan ${(best.probability * 100).toFixed(1)}%. Hasil deteksi teratas: ${topResults}.`;
      }
    }
    return "Sistem Visi Komputer memindai gambar namun tidak mendeteksi pola batik yang dikenali.";
  } catch (e) {
    console.error("Error scanning image:", e);
    return "Terjadi kesalahan saat memindai gambar.";
  }
}
