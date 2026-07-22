import { materialCatalog } from "./materials/index.js";

const format = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });
const $ = selector => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function shapeFor(value) {
  return materialCatalog.find(shape => shape.id === value || shape.label === value);
}

function options(values, selected = "", label = item => item) {
  return `<option value="">선택</option>${values.map(item => {
    const value = typeof item === "string" ? item : item.value;
    return `<option value="${escapeHTML(value)}"${value === selected ? " selected" : ""}>${escapeHTML(label(item))}</option>`;
  }).join("")}`;
}

function field(name, row) {
  return row.querySelector(`[data-field="${name}"]`);
}

function rowTemplate() {
  return `
    <td data-label="도면 번호"><input data-field="drawingNo" type="text" maxlength="40" placeholder="예: A-101" autocomplete="off"></td>
    <td data-label="자재 모양"><select data-field="shapeId" required>${options(materialCatalog.map(shape => ({ value: shape.id, label: shape.label })), "", item => item.label)}</select></td>
    <td data-label="재질"><select data-field="material" required disabled><option value="">모양 먼저 선택</option></select></td>
    <td data-label="규격"><select data-field="spec" required disabled><option value="">재질 먼저 선택</option></select></td>
    <td data-label="절단 길이 (mm)"><input data-field="cutLength" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="mm" required></td>
    <td data-label="홀 가공"><input data-field="holeEnabled" class="hole-toggle" type="checkbox" aria-label="홀 가공 사용"></td>
    <td data-label="홀 지름 (Ø)"><input data-field="holeDiameter" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="Ø mm" disabled></td>
    <td data-label="홀 개수"><input data-field="holeCount" type="number" min="1" step="1" inputmode="numeric" placeholder="개" disabled></td>
    <td data-label="홀 위치"><input data-field="holePosition" type="text" maxlength="80" placeholder="예: 양끝 50mm" disabled></td>
    <td data-label="수량"><input data-field="quantity" type="number" min="1" step="1" inputmode="numeric" value="1" required></td>
    <td data-label="세트"><input data-field="sets" type="number" min="1" step="1" inputmode="numeric" value="1" required></td>
    <td data-label="원자재 길이 (mm)"><input data-field="stockLength" type="number" min="1" step="1" inputmode="decimal" required></td>
    <td data-label="행 작업"><button class="row-delete" type="button" data-action="delete" aria-label="이 행 삭제" title="행 삭제"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button></td>`;
}

function updateMaterialOptions(row, selected = "") {
  const shape = shapeFor(field("shapeId", row).value);
  const select = field("material", row);
  select.disabled = !shape;
  select.innerHTML = shape ? options(Object.keys(shape.materials), selected) : '<option value="">모양 먼저 선택</option>';
  updateSpecOptions(row);
}

function updateSpecOptions(row, selected = "") {
  const shape = shapeFor(field("shapeId", row).value);
  const material = field("material", row).value;
  const select = field("spec", row);
  const specs = shape?.materials[material] ?? [];
  select.disabled = !specs.length;
  select.innerHTML = specs.length ? options(specs.map(item => ({ value: item.spec, label: `${item.spec} · ${item.kgPerM} kg/m` })), selected, item => item.label) : '<option value="">재질 먼저 선택</option>';
}

export function toggleHole(row, enabled = field("holeEnabled", row).checked) {
  field("holeEnabled", row).checked = enabled;
  ["holeDiameter", "holeCount", "holePosition"].forEach(name => {
    const input = field(name, row);
    input.disabled = !enabled;
    if (!enabled) input.value = "";
  });
}

export function addRow(data = {}, standardLength = 6000) {
  const row = document.createElement("tr");
  row.innerHTML = rowTemplate();
  $("#itemRows").append(row);
  field("drawingNo", row).value = data.drawingNo ?? "";
  const shape = shapeFor(data.shapeId);
  field("shapeId", row).value = shape?.id ?? "";
  updateMaterialOptions(row, data.material ?? "");
  field("material", row).value = data.material ?? "";
  updateSpecOptions(row, data.spec ?? "");
  field("spec", row).value = data.spec ?? "";
  field("cutLength", row).value = data.cutLength ?? "";
  field("quantity", row).value = data.quantity ?? 1;
  field("sets", row).value = data.sets ?? 1;
  field("stockLength", row).value = data.stockLength ?? standardLength;
  toggleHole(row, Boolean(data.hole?.enabled));
  if (data.hole?.enabled) {
    field("holeDiameter", row).value = data.hole.diameter ?? "";
    field("holeCount", row).value = data.hole.count ?? "";
    field("holePosition", row).value = data.hole.position ?? "";
  }
  refreshRows();
  return row;
}

export function refreshRows() {
  const rows = [...document.querySelectorAll("#itemRows tr")];
  rows.forEach((row, index) => {
    row.dataset.index = index;
    row.querySelectorAll("input, select").forEach(control => {
      const label = control.closest("td")?.dataset.label;
      if (label) control.setAttribute("aria-label", `${index + 1}행 ${label}`);
    });
  });
  $("#rowCount").textContent = `${rows.length}개 항목`;
}

export function removeRow(row, standardLength) {
  row.remove();
  if (!document.querySelector("#itemRows tr")) addRow({}, standardLength);
  refreshRows();
}

export function copyLastRow(standardLength) {
  const rows = [...document.querySelectorAll("#itemRows tr")];
  if (!rows.length) return addRow({}, standardLength);
  const item = readRow(rows.at(-1));
  item.drawingNo = "";
  item.quantity = 1;
  item.sets = 1;
  return addRow(item, standardLength);
}

function readRow(row) {
  const shape = shapeFor(field("shapeId", row).value);
  const material = field("material", row).value;
  const specValue = field("spec", row).value;
  const spec = shape?.materials[material]?.find(item => item.spec === specValue);
  return {
    drawingNo: field("drawingNo", row).value,
    shapeId: shape?.id ?? field("shapeId", row).value,
    shapeLabel: shape?.label ?? field("shapeId", row).value,
    material,
    spec: specValue,
    kgPerM: spec?.kgPerM ?? 0,
    cutLength: field("cutLength", row).value,
    hole: {
      enabled: field("holeEnabled", row).checked,
      diameter: field("holeDiameter", row).value,
      count: field("holeCount", row).value,
      position: field("holePosition", row).value
    },
    quantity: field("quantity", row).value,
    sets: field("sets", row).value,
    stockLength: field("stockLength", row).value
  };
}

export function getItems() {
  return [...document.querySelectorAll("#itemRows tr")].map(readRow);
}

export function loadItems(items, standardLength) {
  $("#itemRows").replaceChildren();
  (items.length ? items : [{}]).forEach(item => addRow(item, standardLength));
}

export function handleRowChange(target) {
  const row = target.closest("tr");
  if (!row) return;
  if (target.dataset.field === "shapeId") updateMaterialOptions(row);
  if (target.dataset.field === "material") updateSpecOptions(row);
  if (target.dataset.field === "holeEnabled") toggleHole(row, target.checked);
}

export function clearErrors() {
  document.querySelectorAll('[aria-invalid="true"]').forEach(control => control.removeAttribute("aria-invalid"));
  const message = $("#formMessage");
  message.hidden = true;
  message.textContent = "";
}

export function showErrors(errors) {
  clearErrors();
  errors.forEach(error => {
    if (error.index === undefined || !error.field) return;
    const row = document.querySelectorAll("#itemRows tr")[error.index];
    field(error.field, row)?.setAttribute("aria-invalid", "true");
  });
  const message = $("#formMessage");
  message.textContent = errors[0]?.message ?? "입력 내용을 확인하세요.";
  message.hidden = false;
  const firstInvalid = document.querySelector('[aria-invalid="true"]');
  firstInvalid?.focus({ preventScroll: true });
  (firstInvalid ?? message).scrollIntoView({ behavior: "smooth", block: "center" });
}

function metricsHTML(totals) {
  return [
    ["총 부품 수", totals.pieceCount, "개"], ["필요 원자재", totals.barCount, "본"],
    ["예상 발주 중량", totals.weight, "kg"], ["전체 잔재율", totals.scrapRate, "%"]
  ].map(([label, value, unit]) => `<div class="metric"><span>${label}</span><strong>${format.format(value)}<small>${unit}</small></strong></div>`).join("");
}

function bomHTML(bom) {
  const rows = bom.map(item => {
    const drawings = [...item.drawings.entries()].map(([name, count]) => `<span>${escapeHTML(name)} · ${format.format(count)}개</span>`).join("") || "-";
    return `<tr><td class="part-name">${escapeHTML(item.shapeLabel)} · ${escapeHTML(item.material)}<br><small>${escapeHTML(item.spec)}</small></td><td class="number"><strong>${format.format(item.cutLength)}</strong> mm</td><td>${item.holeText === "-" ? "-" : `<span class="hole-label">${escapeHTML(item.holeText)}</span>`}</td><td class="number"><strong>${format.format(item.count)}</strong>개</td><td><div class="drawing-tags">${drawings}</div></td></tr>`;
  }).join("");
  return `<table class="data-table"><thead><tr><th>자재</th><th class="number">절단 길이</th><th>홀 가공 구분</th><th class="number">총수량</th><th>도면별 수량</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function summaryHTML(groups) {
  const rows = groups.map(group => `<tr><td class="part-name">${escapeHTML(group.shapeLabel)} · ${escapeHTML(group.material)}<br><small>${escapeHTML(group.spec)} / ${format.format(group.stockLength)}mm</small></td><td class="number"><strong>${format.format(group.barCount)}</strong>본</td><td class="number">${format.format(group.weight)} kg</td><td class="number">${format.format(group.kerfLoss)} mm</td><td class="number">${format.format(group.leftover)} mm</td><td class="number"><span class="${group.scrapRate > 15 ? "rate-warn" : "rate-good"}">${format.format(group.scrapRate)}%</span></td></tr>`).join("");
  return `<table class="data-table"><thead><tr><th>원자재 규격</th><th class="number">발주</th><th class="number">예상 중량</th><th class="number">톱날 손실</th><th class="number">남는 길이</th><th class="number">잔재율</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function patternKey(bar) {
  return bar.pieces.map(piece => piece.identity).join("→");
}

function barHTML(bar, group, kerf) {
  const pieces = bar.pieces.map((piece, index) => {
    const hole = piece.hole.enabled ? `Ø${piece.hole.diameter}×${piece.hole.count} · ${piece.hole.position}` : (piece.drawingNo || "일반");
    const pieceWidth = Math.max(0, piece.cutLength / group.stockLength * 100);
    const kerfWidth = kerf / group.stockLength * 100;
    return `<div class="cut-piece${piece.hole.enabled ? " holed" : ""}" style="flex:0 0 ${pieceWidth}%" title="${escapeHTML(`${piece.cutLength}mm / ${hole}`)}"><div><strong>${format.format(piece.cutLength)}</strong><small>${escapeHTML(hole)}</small></div></div>${index < bar.pieces.length - 1 ? `<span class="cut-kerf" style="flex-basis:${kerfWidth}%" title="톱날 손실 ${format.format(kerf)}mm"></span>` : ""}`;
  }).join("");
  const remainingWidth = Math.max(0, bar.remaining / group.stockLength * 100);
  return `<div class="cut-bar">${pieces}${remainingWidth ? `<div class="cut-remain" style="flex:0 0 ${remainingWidth}%" title="잔재 ${format.format(bar.remaining)}mm"><span>${remainingWidth > 6 ? `${format.format(bar.remaining)}mm` : ""}</span></div>` : ""}</div>`;
}

function plansHTML(groups, kerf) {
  return groups.map(group => {
    const patterns = new Map();
    group.bars.forEach(bar => {
      const key = patternKey(bar);
      if (!patterns.has(key)) patterns.set(key, { count: 0, bar });
      patterns.get(key).count += 1;
    });
    const body = [...patterns.values()].map(pattern => `<div class="pattern"><div class="pattern-info"><strong>${pattern.count}본</strong> 동일 패턴 · 잔재 ${format.format(pattern.bar.remaining)}mm</div>${barHTML(pattern.bar, group, kerf)}</div>`).join("");
    return `<article class="plan-group"><div class="plan-group-head"><strong>${escapeHTML(group.shapeLabel)} · ${escapeHTML(group.material)} · ${escapeHTML(group.spec)} <small>(${format.format(group.stockLength)}mm)</small></strong><span>총 ${format.format(group.barCount)}본</span></div>${body}</article>`;
  }).join("");
}

export function renderResults(result, settings, projectName, shouldScroll = true) {
  clearErrors();
  $("#metrics").innerHTML = metricsHTML(result.totals);
  $("#bomContainer").innerHTML = bomHTML(result.bom);
  $("#summaryContainer").innerHTML = summaryHTML(result.groups);
  $("#plansContainer").innerHTML = plansHTML(result.groups, Number(settings.kerf));
  $("#printMeta").textContent = `${projectName} · 계산일 ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`;
  const section = $("#results");
  section.hidden = false;
  if (shouldScroll) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function hideResults() { $("#results").hidden = true; }
