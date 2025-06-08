const resultsDiv = document.getElementById('results');
const historyTbody = document.querySelector('#history-table tbody');
let entryCount = 0;

function clearAll() {
  resultsDiv.innerHTML = '';
  historyTbody.innerHTML = '';
  entryCount = 0;
}

function showResultSummary(total = 0, frauds = 0) {
  const legits = total - frauds;
  resultsDiv.innerHTML = `
    <div class="card shadow-sm mb-4">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <h5 class="card-title">Batch Prediction Complete</h5>
          <p>${total} transaction${total === 1 ? '' : 's'} processed</p>
          <p>
            <span class="badge badge-fraud">❌ ${frauds} Fraud</span>
            &nbsp;
            <span class="badge badge-legit">✅ ${legits} Legit</span>
          </p>
        </div>
        <button id="clear-btn" class="btn btn-outline-secondary btn-sm">Clear</button>
      </div>
    </div>`;
  document.getElementById('clear-btn').onclick = clearAll;
}

function appendHistoryRow(item) {
  entryCount++;
  const amt = item.amount != null ? parseFloat(item.amount).toFixed(2) : '—';
  const t = item.time != null ? item.time : '—';
  const isFraud = item.prediction === 1;
  const badge = isFraud
    ? '<span class="badge badge-fraud">❌ Fraud</span>'
    : '<span class="badge badge-legit">✅ Legit</span>';
  const pct = (item.probability * 100).toFixed(1);
  const barCls = isFraud ? 'progress-bar-fraud' : 'progress-bar-legit';

  const tr = document.createElement('tr');
  tr.className = isFraud ? 'fraud' : 'legit';
  tr.innerHTML = `
    <td>${entryCount}</td>
    <td>${amt}</td>
    <td>${t}</td>
    <td>${badge}</td>
    <td>
      <div class="progress" style="height:1rem;">
        <div
          class="progress-bar ${barCls}"
          role="progressbar"
          style="width:${pct}%"
          aria-valuenow="${pct}"
          aria-valuemin="0"
          aria-valuemax="100"
        >${pct}%</div>
      </div>
    </td>
  `;
  historyTbody.appendChild(tr);
}

async function runBatch(blob, filename) {
  const form = new FormData();
  form.append('file', blob, filename);

  const res = await fetch('/api/predict', {
    method: 'POST',
    body: form
  });
  const results = await res.json();
  const fraudCount = results.filter(r => r.prediction === 1).length;

  showResultSummary(results.length, fraudCount);
  results.forEach(r => appendHistoryRow(r));
}

document.getElementById('single-form').onsubmit = async e => {
  e.preventDefault();
  const payload = {
    Amount: parseFloat(document.getElementById('Amount').value)
  };
  for (let i = 1; i <= 28; i++) {
    payload[`V${i}`] = parseFloat(document.getElementById(`V${i}`).value);
  }

  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  const isFraud = data.prediction === 1;
  resultsDiv.innerHTML = `
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        ${isFraud
      ? '<span class="badge badge-fraud">❌ Fraud</span>'
      : '<span class="badge badge-legit">✅ Legit</span>'}
        <div class="mt-3">
          <label>Fraud Probability: ${(data.probability * 100).toFixed(1)}%</label>
          <div class="progress" style="height:1rem;">
            <div
              class="progress-bar ${isFraud ? 'progress-bar-fraud' : 'progress-bar-legit'}"
              role="progressbar"
              style="width:${(data.probability * 100).toFixed(1)}%"
              aria-valuenow="${(data.probability * 100).toFixed(1)}"
              aria-valuemin="0"
              aria-valuemax="100"
            >${(data.probability * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>`;
  appendHistoryRow(data);
};

document.getElementById('batch-form').onsubmit = async e => {
  e.preventDefault();
  const fileInput = document.getElementById('csvfile');
  if (!fileInput.files.length) return;
  await runBatch(fileInput.files[0], fileInput.files[0].name);
};

document.getElementById('test-btn').onclick = async () => {
  const resp = await fetch('/static/test_data.csv');
  const blob = await resp.blob();
  await runBatch(blob, 'test_data.csv');
};
