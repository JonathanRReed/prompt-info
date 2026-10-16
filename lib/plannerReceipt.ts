export function downloadPlannerReceipt(data: { model: string; range: string; central: string; items: string[][]; monthly: string; workload: string }) {
  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 1160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.fillStyle = '#f9f7ef'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const text = (value: string, y: number, size = 25, bold = false) => {
    ctx.fillStyle = '#202126'; ctx.font = `${bold ? '700' : '400'} ${size}px monospace`; ctx.fillText(value, 65, y, 770);
  };
  const rule = (y: number) => { ctx.strokeStyle = '#8b8b84'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(65, y); ctx.lineTo(835, y); ctx.stroke(); };
  text('Prompt Info / Cost receipt', 85, 32, true); rule(120);
  text(data.model, 190, 30, true); text(data.workload, 235, 23);
  text('Estimated range per task', 315, 24); text(data.range, 380, 49, true);
  text(`Central estimate: ${data.central}`, 440, 28); rule(480);
  data.items.forEach(([label, value], i) => { text(label, 540 + i * 58); ctx.textAlign = 'right'; ctx.fillText(value, 835, 540 + i * 58); ctx.textAlign = 'left'; });
  rule(710); text(data.monthly, 775, 30, true);
  text('Editable workload scenarios, not guaranteed bounds.', 850, 22);
  text('API usage only. Tool services and other fees are extra.', 888, 22);
  text('Estimate only. No charges made.', 1020, 23);
  const link = document.createElement('a'); link.download = 'prompt-info-cost-receipt.png'; link.href = canvas.toDataURL('image/png'); link.hidden = true; document.body.append(link); link.click(); link.remove();
  return true;
}
