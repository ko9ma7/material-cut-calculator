import test from "node:test";
import assert from "node:assert/strict";
import { calculateCutting, partIdentity } from "../js/calculator.js";

const settings = { kerf: 3, endTrim: 0 };
const item = overrides => ({
  drawingNo: "A-101", shapeId: "structural-tube", shapeLabel: "구조각관", material: "철", spec: "50x50x2.3",
  kgPerM: 3.34, cutLength: 1000, quantity: 1, sets: 1, stockLength: 6000,
  hole: { enabled: false, diameter: "", count: "", position: "" }, ...overrides
});

test("같은 길이라도 홀 위치가 다르면 다른 부품으로 식별한다", () => {
  const left = item({ hole: { enabled: true, diameter: 10, count: 2, position: "좌측 50mm" } });
  const right = item({ hole: { enabled: true, diameter: 10, count: 2, position: "우측 50mm" } });
  assert.notEqual(partIdentity(left), partIdentity(right));
  const result = calculateCutting([left, right], settings);
  assert.equal(result.errors.length, 0);
  assert.equal(result.bom.length, 2);
  assert.equal(result.groups.length, 1, "동일 원자재는 한 절단 그룹에서 배치한다");
});

test("톱날 두께를 조각 사이 절단 횟수만큼 반영한다", () => {
  const result = calculateCutting([item({ cutLength: 3000 }), item({ cutLength: 2997 })], settings);
  assert.equal(result.groups[0].barCount, 1);
  assert.equal(result.groups[0].kerfLoss, 3);
  assert.equal(result.groups[0].leftover, 0);
});

test("수량과 세트를 곱해 총 부품 수와 발주량을 계산한다", () => {
  const result = calculateCutting([item({ cutLength: 1000, quantity: 3, sets: 2 })], settings);
  assert.equal(result.totals.pieceCount, 6);
  assert.equal(result.totals.barCount, 2, "톱날 두께 때문에 한 본에 5개만 들어간다");
});

test("원자재보다 긴 부품을 누락하지 않고 오류로 막는다", () => {
  const result = calculateCutting([item({ cutLength: 6001 })], settings);
  assert.ok(result.errors.some(error => error.field === "cutLength"));
  assert.equal(result.groups, undefined);
});

test("홀 위치가 없으면 계산을 막는다", () => {
  const result = calculateCutting([item({ hole: { enabled: true, diameter: 12, count: 1, position: "" } })], settings);
  assert.ok(result.errors.some(error => error.field === "holePosition"));
});
