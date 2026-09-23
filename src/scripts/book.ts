import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { bookPages } from "../lib/order.mjs";
GlobalWorkerOptions.workerSrc = workerUrl;
const container = document.querySelector<HTMLElement>("[data-book]");
if (container) {
  const screen = container.querySelector<HTMLElement>(".book-screen")!;
  const stage = container.querySelector<HTMLElement>(".book-stage")!;
  const status = container.querySelector<HTMLElement>(".book-status")!;
  const controls = container.querySelector<HTMLElement>(".book-controls")!;
  const prev = container.querySelector<HTMLButtonElement>(".book-prev")!;
  const next = container.querySelector<HTMLButtonElement>(".book-next")!;
  const zoomOut = container.querySelector<HTMLButtonElement>(".book-zoom-out")!;
  const zoomIn = container.querySelector<HTMLButtonElement>(".book-zoom-in")!;
  const fullscreen =
    container.querySelector<HTMLButtonElement>(".book-fullscreen")!;
  const media = matchMedia("(min-width: 701px)");
  let current = 1;
  let zoom = 1;
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
      zoomOut.disabled = zoom <= 1;
      zoomIn.disabled = zoom >= 1.5;
      stage.classList.toggle("is-zoomed", zoom > 1);
      status.textContent = "Loading pages…";
      stage.setAttribute("aria-busy", "true");
      try {
        const canvases = await Promise.all(
          pages.map(async (number: number) => {
            const page = await pdf.getPage(number);
            const original = page.getViewport({ scale: 1 });
            const width = (stage.clientWidth || 800) / pages.length;
            const maximumHeight =
              window.innerHeight *
              (document.fullscreenElement === screen ? 0.86 : 0.65);
            const scale =
              Math.min(
                width / original.width,
                maximumHeight / original.height,
              ) * zoom;
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
        if (zoom > 1) stage.scrollTo({ left: 0, top: 0 });
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
    zoomOut.addEventListener("click", () => {
      zoom = Math.max(1, +(zoom - 0.25).toFixed(2));
      void render();
    });
    zoomIn.addEventListener("click", () => {
      zoom = Math.min(1.5, +(zoom + 0.25).toFixed(2));
      void render();
    });
    fullscreen.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === screen)
          await document.exitFullscreen();
        else await screen.requestFullscreen();
      } catch {
        status.textContent =
          "Full-screen view is unavailable here. You can open the PDF above.";
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const active = document.fullscreenElement === screen;
      fullscreen.setAttribute("aria-pressed", String(active));
      fullscreen.setAttribute(
        "aria-label",
        active ? "Exit full screen" : "View full screen",
      );
      const enLabel = fullscreen.querySelector<HTMLElement>('[data-lang="en"]');
      const koLabel = fullscreen.querySelector<HTMLElement>('[data-lang="ko"]');
      if (enLabel)
        enLabel.textContent = active ? "EXIT FULL SCREEN" : "FULL SCREEN";
      if (koLabel)
        koLabel.textContent = active ? "전체 화면 종료" : "전체 화면";
      const korean = document.documentElement.lang === "ko";
      fullscreen.setAttribute(
        "aria-label",
        active
          ? korean
            ? "전체 화면 종료"
            : "Exit full screen"
          : korean
            ? "전체 화면"
            : "View full screen",
      );
      void render();
    });
    document.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        turn(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        turn(1);
      }
      if ((event.key === "+" || event.key === "=") && zoom < 1.5) {
        zoom = Math.min(1.5, zoom + 0.25);
        void render();
      }
      if (event.key === "-" && zoom > 1) {
        zoom = Math.max(1, zoom - 0.25);
        void render();
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
      (event) => {
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
      },
      { passive: true },
    );
    stage.addEventListener(
      "touchend",
      (event) => {
        const dx = event.changedTouches[0].clientX - x;
        const dy = event.changedTouches[0].clientY - y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
          turn(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );
    controls.hidden = false;
    await render();
  } catch {
    status.textContent = "Unable to load the book. Please open the PDF above.";
  }
}
