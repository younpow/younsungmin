import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
sharp.cache(false);
test("preparation rotates and strips metadata without changing original", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ysm-images-"));
  try {
    const source = path.join(temp, "local-originals/test");
    await fs.mkdir(source, { recursive: true });
    const original = path.join(source, "01.jpg");
    await sharp({
      create: { width: 3000, height: 2400, channels: 3, background: "#ddd" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toFile(original);
    const before = await fs.readFile(original);
    const result = spawnSync(
      process.execPath,
      [path.resolve("scripts/prepare-images.mjs"), "test"],
      { cwd: temp, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await fs.readFile(original), before);
    const output = await sharp(
      path.join(temp, "public/media/work/test/01.jpg"),
    ).metadata();
    assert.equal(output.width, 1600);
    assert.equal(output.height, 2000);
    assert.equal(output.exif, undefined);
    assert.equal(output.orientation, undefined);
    assert.ok(
      (
        await sharp(
          path.join(temp, "public/media/work/test/responsive/01-640.webp"),
        ).metadata()
      ).height <= 640,
    );
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    await fs.rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
