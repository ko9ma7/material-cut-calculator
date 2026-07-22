const MAX_PIECES = 100000;

const number = value => Number(value);
const rounded = value => Math.round((value + Number.EPSILON) * 1000) / 1000;

export function holeDescription(hole) {
  if (!hole?.enabled) return "-";
  return `Ø${hole.diameter} × ${hole.count} · ${hole.position.trim()}`;
}

export function partIdentity(item) {
  return [item.shapeId, item.material, item.spec, number(item.cutLength), holeDescription(item.hole)].join("|");
}

export function validateProject(items, settings) {
  const errors = [];
  const kerf = number(settings.kerf);
  const endTrim = number(settings.endTrim);
  if (!Number.isFinite(kerf) || kerf < 0) errors.push({ field: "kerf", message: "톱날 두께는 0 이상의 숫자여야 합니다." });
  if (!Number.isFinite(endTrim) || endTrim < 0) errors.push({ field: "endTrim", message: "끝단 여유는 0 이상의 숫자여야 합니다." });

  let pieceCount = 0;
  items.forEach((item, index) => {
    const row = index + 1;
    if (!item.shapeId || !item.material || !item.spec) errors.push({ index, field: "spec", message: `${row}행의 자재 모양·재질·규격을 모두 선택하세요.` });
    const cutLength = number(item.cutLength);
    const stockLength = number(item.stockLength);
    const quantity = number(item.quantity);
    const sets = number(item.sets);
    if (!Number.isFinite(cutLength) || cutLength <= 0) errors.push({ index, field: "cutLength", message: `${row}행의 절단 길이를 입력하세요.` });
    if (!Number.isFinite(stockLength) || stockLength <= 0) errors.push({ index, field: "stockLength", message: `${row}행의 원자재 길이를 입력하세요.` });
    if (Number.isFinite(cutLength) && Number.isFinite(stockLength) && cutLength + endTrim > stockLength) errors.push({ index, field: "cutLength", message: `${row}행의 절단 길이와 끝단 여유 합계가 원자재보다 깁니다.` });
    if (!Number.isInteger(quantity) || quantity < 1) errors.push({ index, field: "quantity", message: `${row}행의 수량은 1 이상의 정수여야 합니다.` });
    if (!Number.isInteger(sets) || sets < 1) errors.push({ index, field: "sets", message: `${row}행의 세트는 1 이상의 정수여야 합니다.` });
    if (Number.isInteger(quantity) && Number.isInteger(sets)) pieceCount += quantity * sets;
    if (item.hole?.enabled) {
      if (!Number.isFinite(number(item.hole.diameter)) || number(item.hole.diameter) <= 0) errors.push({ index, field: "holeDiameter", message: `${row}행의 홀 지름을 입력하세요.` });
      if (!Number.isInteger(number(item.hole.count)) || number(item.hole.count) < 1) errors.push({ index, field: "holeCount", message: `${row}행의 홀 개수는 1 이상의 정수여야 합니다.` });
      if (!item.hole.position?.trim()) errors.push({ index, field: "holePosition", message: `${row}행의 홀 위치를 입력하세요. 같은 길이 부품을 구분하는 기준입니다.` });
    }
  });
  if (!items.length) errors.push({ message: "절단 항목을 한 개 이상 입력하세요." });
  if (pieceCount > MAX_PIECES) errors.push({ message: `총 부품 수는 ${MAX_PIECES.toLocaleString("ko-KR")}개 이하로 나누어 계산하세요.` });
  return errors;
}

function makePiece(item) {
  return {
    identity: partIdentity(item),
    drawingNo: item.drawingNo.trim(),
    cutLength: number(item.cutLength),
    hole: { ...item.hole, diameter: number(item.hole.diameter), count: number(item.hole.count) }
  };
}

function placePieces(pieces, stockLength, kerf, endTrim) {
  const bars = [];
  pieces.sort((a, b) => b.cutLength - a.cutLength).forEach(piece => {
    let bestIndex = -1;
    let smallestRemainder = Infinity;
    bars.forEach((bar, index) => {
      const after = bar.remaining - kerf - piece.cutLength;
      if (after >= -1e-9 && after < smallestRemainder) {
        bestIndex = index;
        smallestRemainder = after;
      }
    });
    if (bestIndex === -1) {
      bars.push({ pieces: [piece], remaining: rounded(stockLength - endTrim - piece.cutLength), kerfCount: 0 });
      return;
    }
    const bar = bars[bestIndex];
    bar.pieces.push(piece);
    bar.kerfCount += 1;
    bar.remaining = rounded(bar.remaining - kerf - piece.cutLength);
  });
  return bars;
}

export function calculateCutting(items, settings) {
  const errors = validateProject(items, settings);
  if (errors.length) return { errors };

  const kerf = number(settings.kerf);
  const endTrim = number(settings.endTrim);
  const bomMap = new Map();
  const groupMap = new Map();
  let totalPieceCount = 0;

  items.forEach(item => {
    const count = number(item.quantity) * number(item.sets);
    totalPieceCount += count;
    const identity = partIdentity(item);
    if (!bomMap.has(identity)) bomMap.set(identity, { ...item, count: 0, drawings: new Map(), holeText: holeDescription(item.hole) });
    const bom = bomMap.get(identity);
    bom.count += count;
    if (item.drawingNo.trim()) bom.drawings.set(item.drawingNo.trim(), (bom.drawings.get(item.drawingNo.trim()) ?? 0) + count);

    const groupKey = [item.shapeId, item.material, item.spec, number(item.stockLength)].join("|");
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, { shapeId: item.shapeId, shapeLabel: item.shapeLabel, material: item.material, spec: item.spec, stockLength: number(item.stockLength), kgPerM: number(item.kgPerM) || 0, pieces: [] });
    const group = groupMap.get(groupKey);
    for (let index = 0; index < count; index += 1) group.pieces.push(makePiece(item));
  });

  const groups = [...groupMap.values()].map(group => {
    const bars = placePieces(group.pieces, group.stockLength, kerf, endTrim);
    const purchasedLength = group.stockLength * bars.length;
    const leftover = rounded(bars.reduce((sum, bar) => sum + bar.remaining, 0));
    const kerfLoss = rounded(bars.reduce((sum, bar) => sum + bar.kerfCount * kerf, 0));
    const endTrimLoss = rounded(bars.length * endTrim);
    const cutLength = rounded(group.pieces.reduce((sum, piece) => sum + piece.cutLength, 0));
    return {
      ...group,
      bars,
      barCount: bars.length,
      purchasedLength,
      leftover,
      kerfLoss,
      endTrimLoss,
      cutLength,
      weight: rounded((purchasedLength / 1000) * group.kgPerM),
      scrapRate: purchasedLength ? rounded((leftover / purchasedLength) * 100) : 0,
      utilization: purchasedLength ? rounded((cutLength / purchasedLength) * 100) : 0
    };
  });

  const purchasedLength = groups.reduce((sum, group) => sum + group.purchasedLength, 0);
  const totals = {
    pieceCount: totalPieceCount,
    barCount: groups.reduce((sum, group) => sum + group.barCount, 0),
    weight: rounded(groups.reduce((sum, group) => sum + group.weight, 0)),
    leftover: rounded(groups.reduce((sum, group) => sum + group.leftover, 0)),
    kerfLoss: rounded(groups.reduce((sum, group) => sum + group.kerfLoss, 0)),
    scrapRate: purchasedLength ? rounded((groups.reduce((sum, group) => sum + group.leftover, 0) / purchasedLength) * 100) : 0
  };
  return { errors: [], bom: [...bomMap.values()].sort((a, b) => number(b.cutLength) - number(a.cutLength)), groups, totals };
}
