import html2canvas from "html2canvas";

type PosterCaptureOptions = {
  backgroundColor?: string;
  colorScheme?: "light" | "dark";
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

const POSTER_ASSET_TIMEOUT = 1200;

function waitForPosterAsset(source: string) {
  return new Promise<void>(resolve => {
    const image = new window.Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    image.crossOrigin = "anonymous";
    image.onload = finish;
    image.onerror = finish;
    image.src = source;
    window.setTimeout(finish, POSTER_ASSET_TIMEOUT);
  });
}

/** Wait for remote shields and logos before html2canvas reads the poster. */
export async function waitForPosterImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(images.map(async image => {
    if (!image.complete) {
      await new Promise<void>(resolve => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        window.setTimeout(finish, POSTER_ASSET_TIMEOUT);
      });
    }

    try {
      const decodePromise = image.decode?.();
      if (decodePromise) {
        await Promise.race([
          decodePromise,
          new Promise<void>(resolve => window.setTimeout(resolve, 600)),
        ]);
      }
    } catch {
      // An optional broken shield must not block the complete poster.
    }
  }));
}

async function waitForPosterBackground(root: HTMLElement) {
  const backgroundImage = window.getComputedStyle(root).backgroundImage;
  const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
  if (match?.[1] && match[1] !== "none") await waitForPosterAsset(match[1]);
}

async function waitForPosterFonts() {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>(resolve => window.setTimeout(resolve, 350)),
    ]);
  }
}

function waitForNextPaint() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

export async function capturePoster(root: HTMLElement, options: PosterCaptureOptions = {}) {
  await Promise.all([
    waitForPosterFonts(),
    waitForPosterImages(root),
    waitForPosterBackground(root),
  ]);
  await waitForNextPaint();

  const width = options.width ?? root.scrollWidth;
  const height = options.height ?? root.scrollHeight;
  const maxDimension = options.maxDimension ?? 2048;
  const requestedScale = options.scale ?? 2;
  const adaptiveScale = Math.min(requestedScale, maxDimension / Math.max(width, height));
  const scale = Math.max(1, adaptiveScale);
  const previousColorScheme = root.style.colorScheme;
  root.style.colorScheme = options.colorScheme ?? "light";

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
  const quality = options.quality ?? 0.88;
  const preferredMime = preferredFormat === "webp" ? "image/webp" : "image/png";
  let actualBlob: Blob | null = null;

  try {
    actualBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, preferredMime, quality));
  } catch {
    actualBlob = null;
  }

  if (!actualBlob) {
    try {
      actualBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    } catch {
      actualBlob = null;
    }
  }

  const link = document.createElement("a");
  let url = "";
  let extension = "png";
  if (actualBlob) {
    extension = actualBlob.type === "image/webp" ? "webp" : "png";
    url = URL.createObjectURL(actualBlob);
  } else {
    // Last-resort path for browsers whose canvas encoder does not expose toBlob.
    url = canvas.toDataURL("image/png");
  }

  link.href = url;
  link.download = `${filenameBase}.${extension}`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (actualBlob) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
