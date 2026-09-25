export function sortImages(files, order) {
  const images = files.filter((name) => /\.(jpe?g|webp)$/i.test(name));
  const numbers = new Map();
  for (const name of images) {
    const match = name.match(/^(?:[a-z][a-z0-9-]*_)?(\d+)\.(?:jpe?g|webp)$/i);
    if (!match) throw new Error("Use numbered image filenames: " + name);
    const number = Number(match[1]);
    if (number < 1 || [...numbers.values()].includes(number))
      throw new Error("Duplicate or invalid image number: " + name);
    numbers.set(name, number);
  }
  if (order) {
    if (
      order.length !== images.length ||
      new Set(order).size !== order.length ||
      order.some((name) => !images.includes(name))
    )
      throw new Error("Image order must list every image exactly once");
    return [...order];
  }
  return images.sort((a, b) => numbers.get(a) - numbers.get(b));
}
export function bookPages(page, total, spread) {
  const start = spread && page > 1 ? page - (page % 2) : page;
  return spread && start > 1 && start < total ? [start, start + 1] : [start];
}
