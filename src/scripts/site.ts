function setLanguage(lang: string) {
  document.documentElement.lang = lang;
  document
    .querySelectorAll<HTMLButtonElement>("[data-language]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.language === lang)),
    );
}
setLanguage(document.documentElement.lang);
document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((b) =>
  b.addEventListener("click", () => {
    const lang = b.dataset.language || "en";
    setLanguage(lang);
    try {
      localStorage.setItem("ysm-language", lang);
    } catch {
      /* Storage may be disabled. */
    }
  }),
);
document.addEventListener("contextmenu", (e) => {
  if (
    e.target instanceof Element &&
    e.target.closest(".artwork,.lightbox img,.book-stage")
  )
    e.preventDefault();
});
document.addEventListener("dragstart", (e) => {
  if (e.target instanceof Element && e.target.closest(".artwork,.lightbox img"))
    e.preventDefault();
});
