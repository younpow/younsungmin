import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { bookPages } from "../lib/order.mjs";
GlobalWorkerOptions.workerSrc = workerUrl;
const container = document.querySelector<HTMLElement>("[data-book]");
if (container) {
  const stage = container.querySelector<HTMLElement>(".book-stage")!;
  const status = container.querySelector<HTMLElement>(".book-status")!;
  const controls = container.querySelector<HTMLElement>(".book-controls")!;
  const prev = container.querySelector<HTMLButtonElement>(".book-prev")!;
  const next = container.querySelector<HTMLButtonElement>(".book-next")!;
  const media = matchMedia("(min-width: 701px)");
  let current = 1;
  let version = 0;
  try {
    const pdf = await getDocument({
      url: container.dataset.book!,
      cMapUrl: "/vendor/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
      wasmUrl: "/vendor/pdfjs/wasm/",
      iccUrl: "/vendor/pdfjs/iccs/",
    }).promise;
    async function render() {
      const ticket = ++version;
      const pages = bookPages(current, pdf.numPages, media.matches);
      current = pages[0];
      prev.disabled = current === 1;
      next.disabled = pages[pages.length - 1] === pdf.numPages;
      status.textContent = "Loading pages…";
      stage.setAttribute("aria-busy", "true");
      try {
        const canvases = await Promise.all(
          pages.map(async (number: number) => {
            const page = await pdf.getPage(number);
            const original = page.getViewport({ scale: 1 });
            const width = (stage.clientWidth || 800) / pages.length;
            const scale = Math.min(
              width / original.width,
              (window.innerHeight * 0.65) / original.height,
            );
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({ scale: scale * ratio });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = viewport.width / ratio + "px";
            canvas.setAttribute("role", "img");
            canvas.setAttribute("aria-label", "Book page " + number);
            canvas.dataset.page = String(number);
            await page.render({ canvas, viewport }).promise;
            return canvas;
          }),
        );
        if (ticket !== version) return;
        stage.replaceChildren(...canvases);
        status.textContent = pages.join(" – ") + " / " + pdf.numPages;
      } catch {
        if (ticket === version)
          status.textContent =
            "Unable to display these pages. Please open the PDF below.";
      } finally {
        if (ticket === version) stage.removeAttribute("aria-busy");
      }
    }
    function turn(direction: number) {
      const pages = bookPages(current, pdf.numPages, media.matches);
      const target = direction > 0 ? pages[pages.length - 1] + 1 : current - 1;
      if (target < 1 || target > pdf.numPages) return;
      current = target;
      void render();
    }
    prev.addEventListener("click", () => turn(-1));
    next.addEventListener("click", () => turn(1));
    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        turn(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        turn(1);
      }
    });
    let timer: ReturnType<typeof setTimeout>;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => void render(), 150);
    });
    let x = 0;
    let y = 0;
    stage.addEventListener(
      "touchstart",
      (e) => {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      },
      { passive: true },
    );
    stage.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - x;
        const dy = e.changedTouches[0].clientY - y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
          turn(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );
    controls.hidden = false;
    await render();
  } catch {
    status.textContent = "Unable to load the book. Please open the PDF below.";
  }
}
