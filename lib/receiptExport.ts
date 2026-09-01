import type { CostComparisonRow } from './costComparison';

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Unavailable';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 4 : 2 });
}

export function downloadCostReceiptImage({
  row,
  assumptions,
  source,
}: {
  row: CostComparisonRow;
  assumptions: string[];
  source: string;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext('2d');
  if (!context) return;

  context.fillStyle = '#080808';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#e61919';
  context.fillRect(80, 92, 1040, 728);
  context.fillStyle = '#111111';
  context.fillRect(64, 76, 1040, 728);
  context.strokeStyle = '#3a3a3a';
  context.strokeRect(64, 76, 1040, 728);

  context.fillStyle = '#e61919';
  context.font = '700 22px monospace';
  context.fillText('PROMPT INFO / COST RECEIPT', 112, 142);
  context.fillStyle = '#f2f2f2';
  context.font = '900 50px sans-serif';
  context.fillText(row.model.slice(0, 36), 112, 220);

  const totals = [
    ['ONE REQUEST', money(row.requestCost)],
    ['SESSION', money(row.sessionCost)],
    ['MONTHLY', money(row.monthlyCost)],
    ['ANNUAL', money(row.annualCost)],
  ];
  totals.forEach(([label, value], index) => {
    const y = 310 + index * 86;
    context.fillStyle = '#8c8c8c';
    context.font = '700 18px monospace';
    context.fillText(label, 112, y);
    context.fillStyle = index === 1 ? '#e61919' : '#f2f2f2';
    context.font = '700 30px monospace';
    context.textAlign = 'right';
    context.fillText(value, 1056, y);
    context.textAlign = 'left';
    context.strokeStyle = '#303030';
    context.beginPath();
    context.moveTo(112, y + 28);
    context.lineTo(1056, y + 28);
    context.stroke();
  });

  context.fillStyle = '#b7b7b7';
  context.font = '18px monospace';
  assumptions.slice(0, 3).forEach((line, index) => context.fillText(line.slice(0, 86), 112, 666 + index * 30));
  context.fillStyle = '#777777';
  context.fillText(source.slice(0, 86), 112, 772);

  const link = document.createElement('a');
  link.download = 'prompt-info-cost-receipt.png';
  link.href = canvas.toDataURL('image/png');
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
}
