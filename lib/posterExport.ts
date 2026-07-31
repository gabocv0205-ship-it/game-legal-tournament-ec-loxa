import html2canvas from "html2canvas";

type PosterCaptureOptions = {
  backgroundColor?: string;
  scale?: number;
  maxDimension?: number;
  width?: number;
  height?: number;
  windowWidth?: number;
  windowHeight?: number;
};

type PosterDownloadOptions = {
  format?: "webp" | "png";
  quality?: number;
};

/** Wait for remote shields and logos before html2canvas reads the poster. */
export async function waitForPosterImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(images.map(async image => {
    if (!image.complete) {
      await new Promise<void>(resolve => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        window.setTimeout(finish, 5000);
      });
    }

    try {
      await image.decode?.();
    } catch {
      // An optional broken shield must not block the complete poster.
    }
  }));
}

async function waitForPosterFonts() {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

function waitForNextPaint() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function capturePoster(root: HTMLElement, options: PosterCaptureOptions = {}) {
  await waitForPosterFonts();
  await waitForPosterImages(root);
  await waitForNextPaint();

  const width = options.width ?? root.scrollWidth;
  const height = options.height ?? root.scrollHeight;
  const maxDimension = options.maxDimension ?? 2560;
  const requestedScale = options.scale ?? 2;
  const adaptiveScale = Math.min(requestedScale, maxDimension / Math.max(width, height));
  const scale = Math.max(1, adaptiveScale);
  const previousColorScheme = root.style.colorScheme;
  root.style.colorScheme = "light";

  try {
    return await html2canvas(root, {
      backgroundColor: options.backgroundColor ?? "#050505",
      scale,
      useCORS: true,
      width,
      height,
      windowWidth: options.windowWidth ?? width,
      windowHeight: options.windowHeight ?? height,
    });
  } finally {
    root.style.colorScheme = previousColorScheme;
  }
}

export async function downloadPosterCanvas(
  canvas: HTMLCanvasElement,
  filenameBase: string,
  options: PosterDownloadOptions = {},
) {
  const preferredFormat = options.format ?? "webp";
  const quality = options.quality ?? 0.92;
  const preferredMime = preferredFormat === "webp" ? "image/webp" : "image/png";
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, preferredMime, quality));
  const actualBlob = blob || await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!actualBlob) throw new Error("No se pudo preparar el archivo gráfico.");

  const extension = actualBlob.type === "image/webp" ? "webp" : "png";
  const url = URL.createObjectURL(actualBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameBase}.${extension}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
