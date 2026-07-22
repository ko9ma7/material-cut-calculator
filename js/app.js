import { calculateCutting } from "./calculator.js";
import { addRow, clearErrors, copyLastRow, getItems, handleRowChange, hideResults, loadItems, removeRow, renderResults, showErrors } from "./ui.js";
import { clearAutoSave, downloadProject, loadAutoSave, readProjectFile, saveAutoSave } from "./storage.js";

const $ = selector => document.querySelector(selector);
let hadResults = false;
let saveTimer;
let toastTimer;
let previousStandardLength = 6000;

function settings() {
  return { standardLength: $("#standardLength").value, kerf: $("#kerf").value, endTrim: $("#endTrim").value };
}

function project() {
  return { version: 2, projectName: $("#projectName").value.trim() || "새 절단 작업", settings: settings(), items: getItems(), hadResults };
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 2600);
}

function queueSave() {
  $("#saveStatus").textContent = "저장 중…";
  $("#saveStatus").classList.remove("saved");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveAutoSave(project());
    $("#saveStatus").textContent = "브라우저에 저장됨";
    $("#saveStatus").classList.add("saved");
  }, 220);
}

function invalidateResults() {
  if (!hadResults) return;
  hadResults = false;
  hideResults();
}

function runCalculation(shouldScroll = true) {
  const result = calculateCutting(getItems(), settings());
  if (result.errors.length) {
    hadResults = false;
    hideResults();
    showErrors(result.errors);
    queueSave();
    return false;
  }
  hadResults = true;
  renderResults(result, settings(), $("#projectName").value.trim() || "새 절단 작업", shouldScroll);
  queueSave();
  return true;
}

function loadProject(data, restoreResults = data.hadResults) {
  $("#projectName").value = data.projectName || "불러온 절단 작업";
  $("#standardLength").value = data.settings.standardLength;
  $("#kerf").value = data.settings.kerf;
  $("#endTrim").value = data.settings.endTrim;
  previousStandardLength = Number(data.settings.standardLength);
  loadItems(data.items, data.settings.standardLength);
  hadResults = Boolean(restoreResults);
  if (hadResults) runCalculation(false); else hideResults();
  queueSave();
}

function resetProject() {
  clearAutoSave();
  loadProject({ projectName: "새 절단 작업", settings: { standardLength: 6000, kerf: 3, endTrim: 0 }, items: [], hadResults: false }, false);
  clearErrors();
  toast("새 작업을 시작했습니다.");
}

$("#calculatorForm").addEventListener("submit", event => { event.preventDefault(); runCalculation(true); });
$("#calculatorForm").addEventListener("input", () => { invalidateResults(); queueSave(); });
$("#calculatorForm").addEventListener("change", event => { handleRowChange(event.target); invalidateResults(); queueSave(); });
$("#itemRows").addEventListener("click", event => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  removeRow(button.closest("tr"), Number($("#standardLength").value) || 6000);
  hadResults = false;
  hideResults();
  queueSave();
});
$("#addRowButton").addEventListener("click", () => { invalidateResults(); addRow({}, Number($("#standardLength").value) || 6000).querySelector("input")?.focus(); queueSave(); });
$("#copyRowButton").addEventListener("click", () => { invalidateResults(); copyLastRow(Number($("#standardLength").value) || 6000); queueSave(); });

$(".setup-panel").addEventListener("input", () => { invalidateResults(); queueSave(); });
$("#standardLength").addEventListener("change", () => {
  const next = Number($("#standardLength").value);
  if (!Number.isFinite(next) || next <= 0) return;
  document.querySelectorAll('[data-field="stockLength"]').forEach(input => {
    if (Number(input.value) === previousStandardLength) input.value = next;
  });
  previousStandardLength = next;
  hadResults = false;
  hideResults();
  queueSave();
});

$("#downloadButton").addEventListener("click", () => { downloadProject(project()); toast("작업 파일을 저장했습니다."); });
$("#fileInput").addEventListener("change", async event => {
  try {
    const imported = await readProjectFile(event.target.files[0]);
    loadProject(imported, imported.hadResults);
    toast("작업 파일을 불러왔습니다.");
  } catch (error) { toast(error.message); }
  finally { event.target.value = ""; }
});
const fileLabel = document.querySelector('label[for="fileInput"]');
fileLabel.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("#fileInput").click(); } });

$("#newButton").addEventListener("click", () => { if (confirm("현재 작업을 지우고 새 작업을 시작할까요? JSON 파일로 저장하지 않은 내용은 복구할 수 없습니다.")) resetProject(); });
[$("#printButton"), $("#printResultButton")].forEach(button => button.addEventListener("click", () => {
  if (!hadResults && !runCalculation(false)) return;
  window.print();
}));

const dialog = $("#helpDialog");
$("#helpButton").addEventListener("click", () => dialog.showModal());
$("[data-close-dialog]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#themeButton").setAttribute("aria-label", theme === "dark" ? "밝은 화면으로 전환" : "어두운 화면으로 전환");
}
applyTheme(localStorage.getItem("cutflow.theme") ?? "light");
$("#themeButton").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("cutflow.theme", theme);
  applyTheme(theme);
});

const saved = loadAutoSave();
if (saved) {
  loadProject(saved, saved.hadResults);
  toast(saved.hadResults ? "이전 계산 결과를 복원했습니다." : "이전 작업을 복원했습니다.");
} else {
  addRow({}, 6000);
  queueSave();
}
