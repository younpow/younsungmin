const dialog = document.querySelector<HTMLDialogElement>(".lightbox");
if (dialog) {
  const controls = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-photo]"),
  );
  const image = dialog.querySelector("img")!;
  const prev = dialog.querySelector<HTMLButtonElement>(".lightbox-prev")!;
  const next = dialog.querySelector<HTMLButtonElement>(".lightbox-next")!;
  let index = 0;
  let trigger: HTMLButtonElement | undefined;
  let oldOverflow = "";
  function show(n: number) {
    index = Math.max(0, Math.min(controls.length - 1, n));
    const source = controls[index].querySelector("img")!;
    image.src = source.src;
    image.alt = source.alt;
    prev.disabled = index === 0;
    next.disabled = index === controls.length - 1;
    dialog!.querySelector(".lightbox-status")!.textContent =
      index + 1 + " / " + controls.length;
  }
  controls.forEach((button, n) =>
    button.addEventListener("click", () => {
      trigger = button;
      show(n);
      oldOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
    }),
  );
  dialog
    .querySelector(".lightbox-close")!
    .addEventListener("click", () => dialog.close());
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      show(index - 1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      show(index + 1);
    }
  });
  dialog.addEventListener("close", () => {
    document.body.style.overflow = oldOverflow;
    image.removeAttribute("src");
    trigger?.focus();
  });
  let x = 0;
  let y = 0;
  dialog.addEventListener(
    "touchstart",
    (e) => {
      x = e.changedTouches[0].clientX;
      y = e.changedTouches[0].clientY;
    },
    { passive: true },
  );
  dialog.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - x;
      const dy = e.changedTouches[0].clientY - y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
        show(index + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );
}
