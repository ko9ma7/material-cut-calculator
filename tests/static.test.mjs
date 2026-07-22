import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { materialCatalog } from "../js/materials/index.js";

test("GitHub Pages 진입 파일과 모듈 참조가 존재한다", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /type="module" src="js\/app\.js"/);
  assert.doesNotMatch(html, /onclick=/);
  await access(new URL("../css/styles.css", import.meta.url));
  await access(new URL("../css/print.css", import.meta.url));
});

test("기존 자재표 6종과 444개 규격을 손실 없이 분리했다", () => {
  assert.equal(materialCatalog.length, 6);
  const count = materialCatalog.reduce((total, shape) => total + Object.values(shape.materials).flat().length, 0);
  assert.equal(count, 444);
});
