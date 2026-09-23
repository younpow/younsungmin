export function sortImages(files) {
  const images = files.filter((name) => /\.(jpe?g|webp)$/i.test(name));
  const seen = new Set();
  for (const name of images) {
    if (!/^\d+\.(jpe?g|webp)$/i.test(name))
      throw new Error("Use numbered image filenames: " + name);
    const n = Number(name.split(".")[0]);
    if (n < 1 || seen.has(n))
      throw new Error("Duplicate or invalid image number: " + name);
    seen.add(n);
  }
  return images.sort((a, b) => parseInt(a) - parseInt(b));
}
export function bookPages(page, total, spread) {
  const start = spread && page > 1 ? page - (page % 2) : page;
  return spread && start > 1 && start < total ? [start, start + 1] : [start];
}
