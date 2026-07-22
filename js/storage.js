const STORAGE_KEY = "cutflow.project.v2";

const numeric = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function migrateItem(item = {}) {
  const enabled = Boolean(item.hole?.enabled ?? item.isHole);
  const material = String(item.material ?? item.type ?? "");
  return {
    drawingNo: String(item.drawingNo ?? item.dwgNo ?? ""),
    shapeId: String(item.shapeId ?? item.shape ?? ""),
    material: material === "스테인레이스" ? "스테인리스" : material,
    spec: String(item.spec ?? ""),
    cutLength: numeric(item.cutLength ?? item.cutLen, ""),
    hole: {
      enabled,
      diameter: enabled ? numeric(item.hole?.diameter ?? item.holeDia, "") : "",
      count: enabled ? numeric(item.hole?.count ?? item.holeCnt, "") : "",
      position: enabled ? String(item.hole?.position ?? item.holePosition ?? "위치 미기록") : ""
    },
    quantity: numeric(item.quantity ?? item.qty, 1),
    sets: numeric(item.sets ?? item.set, 1),
    stockLength: numeric(item.stockLength ?? item.baseLen, 6000)
  };
}

export function normalizeProject(data = {}) {
  const settings = data.settings ?? {};
  return {
    version: 2,
    projectName: String(data.projectName ?? "불러온 절단 작업").slice(0, 80),
    settings: {
      standardLength: numeric(settings.standardLength ?? settings.stdLen, 6000),
      kerf: numeric(settings.kerf ?? settings.cutLoss, 3),
      endTrim: numeric(settings.endTrim, 0)
    },
    items: Array.isArray(data.items) ? data.items.map(migrateItem) : [],
    hadResults: Boolean(data.hadResults),
    savedAt: data.savedAt ?? null
  };
}

export function loadAutoSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("calcData_autoSave_Pro");
    return raw ? normalizeProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveAutoSave(project) {
  const payload = { ...normalizeProject(project), savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearAutoSave() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("calcData_autoSave_Pro");
}

export async function readProjectFile(file) {
  if (!file || file.size > 5 * 1024 * 1024) throw new Error("5MB 이하의 JSON 파일을 선택하세요.");
  let parsed;
  try { parsed = JSON.parse(await file.text()); }
  catch { throw new Error("올바른 JSON 작업 파일이 아닙니다."); }
  const project = normalizeProject(parsed);
  if (!project.items.length) throw new Error("파일에 절단 항목이 없습니다.");
  return project;
}

export function downloadProject(project) {
  const payload = { ...normalizeProject(project), hadResults: project.hadResults, savedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  const safeName = (payload.projectName || "절단작업").replace(/[\\/:*?"<>|]/g, "-").slice(0, 50);
  link.href = URL.createObjectURL(blob);
  link.download = `${safeName}_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
