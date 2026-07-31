import html2canvas from "html2canvas";

type PosterCaptureOptions = {
  backgroundColor?: string;
  scale?: number;
  width?: number;
  height?: number;
  windowWidth?: number;
  windowHeight?: number;
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

export async function capturePoster(root: HTMLElement, options: PosterCaptureOptions = {}) {
  await waitForPosterImages(root);

  const width = options.width ?? root.scrollWidth;
  const height = options.height ?? root.scrollHeight;

  return html2canvas(root, {
    backgroundColor: options.backgroundColor ?? "#050505",
    scale: options.scale ?? 2,
    useCORS: true,
    width,
    height,
    windowWidth: options.windowWidth ?? width,
    windowHeight: options.windowHeight ?? height,
  });
}
