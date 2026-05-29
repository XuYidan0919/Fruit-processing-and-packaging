const RAW_COST = { A: 2, B: 3 };
const SPECS = [5, 8, 10];

const els = {
  pageBadge: document.querySelector("#pageBadge"),
  inputPage: document.querySelector("#inputPage"),
  resultPage: document.querySelector("#resultPage"),
  batchNo: document.querySelector("#batchNo"),
  rawA: document.querySelector("#rawA"),
  rawB: document.querySelector("#rawB"),
  pack5: document.querySelector("#pack5"),
  pack8: document.querySelector("#pack8"),
  pack10: document.querySelector("#pack10"),
  defective: document.querySelector("#defective"),
  loss: document.querySelector("#loss"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  calculateBtn: document.querySelector("#calculateBtn"),
  backBtn: document.querySelector("#backBtn"),
  inputIssues: document.querySelector("#inputIssues"),
  issues: document.querySelector("#issues"),
  rawConsumed: document.querySelector("#rawConsumed"),
  finishedWeight: document.querySelector("#finishedWeight"),
  defectiveWeight: document.querySelector("#defectiveWeight"),
  lossWeight: document.querySelector("#lossWeight"),
  balanceDiff: document.querySelector("#balanceDiff"),
  rawCostTotal: document.querySelector("#rawCostTotal"),
  finishedCost: document.querySelector("#finishedCost"),
  defectiveCost: document.querySelector("#defectiveCost"),
  lossCost: document.querySelector("#lossCost"),
  unitCost: document.querySelector("#unitCost"),
};

const sampleInput = {
  batchNo: "BATCH-001",
  rawA: 80,
  rawB: 40,
  packs: { 5: 8, 8: 6, 10: 2 },
  defective: 8,
  loss: 4,
};

function numberFrom(input) {
  return Number(input.value || 0);
}

function readInput() {
  return {
    batchNo: els.batchNo.value.trim() || "未命名批次",
    rawA: numberFrom(els.rawA),
    rawB: numberFrom(els.rawB),
    packs: {
      5: numberFrom(els.pack5),
      8: numberFrom(els.pack8),
      10: numberFrom(els.pack10),
    },
    defective: numberFrom(els.defective),
    loss: numberFrom(els.loss),
  };
}

function writeInput(input) {
  els.batchNo.value = input.batchNo;
  els.rawA.value = input.rawA;
  els.rawB.value = input.rawB;
  els.pack5.value = input.packs[5];
  els.pack8.value = input.packs[8];
  els.pack10.value = input.packs[10];
  els.defective.value = input.defective;
  els.loss.value = input.loss;
}

function validateInput(input) {
  const issues = [];
  const values = [
    input.rawA,
    input.rawB,
    input.packs[5],
    input.packs[8],
    input.packs[10],
    input.defective,
    input.loss,
  ];

  if (values.some((value) => Number.isNaN(value) || value < 0)) {
    issues.push({ level: "error", message: "所有数量必须是大于等于 0 的数字。" });
  }

  if (values.some((value) => value > 999999)) {
    issues.push({ level: "error", message: "演示版单个数量不能超过 999999。" });
  }

  const hasTooManyDecimals = values.some((value) => Number.isFinite(value) && !Number.isInteger(value * 100));
  if (hasTooManyDecimals) {
    issues.push({ level: "error", message: "重量最多保留 2 位小数。" });
  }

  const hasFractionalPack = SPECS.some((spec) => !Number.isInteger(input.packs[spec]));
  if (hasFractionalPack) {
    issues.push({ level: "error", message: "成品包数必须是整数。" });
  }

  if (SPECS.some((spec) => input.packs[spec] > 9999)) {
    issues.push({ level: "error", message: "演示版单个规格包数不能超过 9999。" });
  }

  if (input.batchNo.length > 30) {
    issues.push({ level: "error", message: "批次号最多 30 个字符。" });
  }

  const inventory = calculateInventory(input);
  if (Math.abs(inventory.balanceDiff) > 0.001) {
    issues.push({
      level: "error",
      message: `投入和产出不守恒，差异 ${formatWeight(inventory.balanceDiff)}。请确认次果或损耗是否漏录。`,
    });
  }

  if (inventory.rawConsumedWeight === 0) {
    issues.push({ level: "error", message: "原料投入不能为 0。" });
  }

  const outputWeight = inventory.finishedWeight + inventory.defectiveWeight + inventory.lossWeight;
  if (outputWeight === 0) {
    issues.push({ level: "error", message: "产出重量不能为 0，否则无法进行成本分摊。" });
  }

  return issues;
}

function calculateInventory(input) {
  const rawConsumedWeight = input.rawA + input.rawB;
  const finishedWeight = SPECS.reduce((sum, spec) => sum + input.packs[spec] * spec, 0);
  const outputWeight = finishedWeight + input.defective + input.loss;

  return {
    rawConsumedWeight,
    finishedWeight,
    defectiveWeight: input.defective,
    lossWeight: input.loss,
    balanceDiff: rawConsumedWeight - outputWeight,
  };
}

function calculateCost(input, inventory) {
  const rawCostTotal = input.rawA * RAW_COST.A + input.rawB * RAW_COST.B;
  const allocatedWeight = inventory.finishedWeight + inventory.defectiveWeight + inventory.lossWeight;
  if (allocatedWeight <= 0) {
    return {
      rawCostTotal,
      finishedCost: null,
      defectiveCost: null,
      lossCost: null,
      unitCost: null,
    };
  }

  const costPerJin = rawCostTotal / allocatedWeight;

  return {
    rawCostTotal,
    finishedCost: inventory.finishedWeight * costPerJin,
    defectiveCost: inventory.defectiveWeight * costPerJin,
    lossCost: inventory.lossWeight * costPerJin,
    unitCost: inventory.finishedWeight > 0 ? (inventory.finishedWeight * costPerJin) / inventory.finishedWeight : 0,
  };
}

function calculateProcessing(input) {
  const inventory = calculateInventory(input);
  const cost = calculateCost(input, inventory);
  const issues = validateInput(input);
  return { input, inventory, cost, issues };
}

function formatWeight(value) {
  return `${round(value)} 斤`;
}

function formatMoney(value) {
  if (value === null || !Number.isFinite(value)) {
    return "无法计算";
  }
  return `${round(value)} 元`;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function renderIssues(issues) {
  if (issues.length === 0) {
    els.issues.innerHTML = '<div class="issue success">校验通过：当前批次投入和产出守恒。</div>';
    return;
  }

  els.issues.innerHTML = issues
    .map((issue) => `<div class="issue ${issue.level}">${issue.message}</div>`)
    .join("");
}

function hasBlockingError(issues) {
  return issues.some((issue) => issue.level === "error");
}

function renderResult(result) {
  const { inventory, cost, issues } = result;
  renderIssues(issues);
  els.rawConsumed.textContent = formatWeight(inventory.rawConsumedWeight);
  els.finishedWeight.textContent = formatWeight(inventory.finishedWeight);
  els.defectiveWeight.textContent = formatWeight(inventory.defectiveWeight);
  els.lossWeight.textContent = formatWeight(inventory.lossWeight);
  els.balanceDiff.textContent = formatWeight(inventory.balanceDiff);
  els.rawCostTotal.textContent = formatMoney(cost.rawCostTotal);
  els.finishedCost.textContent = formatMoney(cost.finishedCost);
  els.defectiveCost.textContent = formatMoney(cost.defectiveCost);
  els.lossCost.textContent = formatMoney(cost.lossCost);
  els.unitCost.textContent = cost.unitCost === null ? "无法计算" : `${round(cost.unitCost)} 元/斤`;
}

function showPage(page) {
  const isResult = page === "result";
  els.inputPage.classList.toggle("hidden", isResult);
  els.resultPage.classList.toggle("hidden", !isResult);
  els.pageBadge.textContent = isResult ? "结果" : "录入";
}

els.loadSampleBtn.addEventListener("click", () => writeInput(sampleInput));

els.calculateBtn.addEventListener("click", () => {
  const result = calculateProcessing(readInput());
  if (hasBlockingError(result.issues)) {
    renderInputIssues(result.issues);
    return;
  }
  els.inputIssues.innerHTML = "";
  renderResult(result);
  showPage("result");
});

els.backBtn.addEventListener("click", () => showPage("input"));

function renderInputIssues(issues) {
  els.inputIssues.innerHTML = issues
    .filter((issue) => issue.level === "error")
    .map((issue) => `<div class="issue error">${issue.message}</div>`)
    .join("");
}
