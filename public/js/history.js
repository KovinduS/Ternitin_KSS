/* ==========================================
   TERNITIN - HISTORY PAGE LOGIC
   Loads scan history, stats, pagination
   ========================================== */

// ===== Theme Management =====
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  lucide.createIcons();
}

document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
initTheme();

// ===== State =====
let currentPage = 1;
let currentStatus = '';
let currentSortBy = 'createdAt';
let currentSortOrder = 'desc';
const limit = 15;

// ===== DOM Elements =====
const historyList = document.getElementById('historyList');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const statsDashboard = document.getElementById('statsDashboard');

// ===== Fetch Stats =====
async function fetchStats() {
  try {
    const response = await fetch('/api/history/stats');
    const data = await response.json();

    document.getElementById('statTotal').textContent = data.totalScans || 0;
    document.getElementById('statSuccess').textContent = data.completedScans || 0;
    document.getElementById('statPlagiarism').textContent = (data.avgPlagiarismScore || 0) + '%';
    document.getElementById('statAI').textContent = (data.avgAIScore || 0) + '%';
    document.getElementById('statWords').textContent = formatNumber(data.totalWordsScanned || 0);
    document.getElementById('statRecent').textContent = data.recentScans || 0;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
}

// ===== Fetch History =====
async function fetchHistory() {
  try {
    historyList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        Loading history...
      </div>
    `;

    const params = new URLSearchParams({
      page: currentPage,
      limit,
      status: currentStatus,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder
    });

    const response = await fetch(`/api/history?${params}`);
    const data = await response.json();

    renderHistory(data.scans, data.pagination);
  } catch (error) {
    console.error('Failed to fetch history:', error);
    historyList.innerHTML = `
      <div class="error-state">
        <i data-lucide="alert-circle"></i>
        <p>Failed to load history. Please refresh.</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// ===== Render History =====
function renderHistory(scans, paginationData) {
  if (!scans || scans.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <i data-lucide="file-x"></i>
        <h3>No scans yet</h3>
        <p>Upload a document to start analyzing for plagiarism and AI content.</p>
        <a href="/" class="btn btn-primary">Go to Upload</a>
      </div>
    `;
    pagination.hidden = true;
    lucide.createIcons();
    return;
  }

  historyList.innerHTML = scans.map(scan => `
    <div class="history-item" data-id="${scan._id}">
      <div class="item-status ${scan.status}">
        ${getStatusIcon(scan.status)}
      </div>

      <div class="item-info">
        <div class="item-name">${escapeHtml(scan.originalName)}</div>
        <div class="item-meta">
          <span><i data-lucide="calendar"></i> ${formatDate(scan.createdAt)}</span>
          <span><i data-lucide="file-text"></i> ${scan.wordCount || 0} words</span>
          ${scan.status === 'completed' ? `
            <span><i data-lucide="link"></i> ${scan.plagiarism?.matches?.length || 0} matches</span>
          ` : ''}
        </div>
      </div>

      <div class="item-scores">
        ${scan.status === 'completed' ? `
          <span class="score-badge plagiarism">
            <i data-lucide="copy"></i> ${scan.plagiarism?.score || 0}%
          </span>
          <span class="score-badge ai">
            <i data-lucide="cpu"></i> ${scan.aiDetection?.score || 0}%
          </span>
        ` : `
          <span class="score-badge ${scan.status === 'failed' ? 'ai' : 'plagiarism'}">
            ${scan.status.toUpperCase()}
          </span>
        `}
      </div>

      <div class="item-actions">
        ${scan.status === 'completed' ? `
          <button class="action-btn view" data-id="${scan._id}" title="View details">
            <i data-lucide="eye"></i>
          </button>
        ` : ''}
        <button class="action-btn delete" data-id="${scan._id}" title="Delete">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Pagination
  if (paginationData && paginationData.pages > 1) {
    pagination.hidden = false;
    pageInfo.textContent = `Page ${paginationData.page} of ${paginationData.pages}`;
  } else {
    pagination.hidden = true;
  }

  lucide.createIcons();
  attachItemEvents();
}

// ===== Event Handlers =====
function attachItemEvents() {
  document.querySelectorAll('.action-btn.view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewScan(btn.dataset.id);
    });
  });

  document.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteScan(btn.dataset.id);
    });
  });

  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.querySelector('.action-btn.view')) {
        viewScan(item.dataset.id);
      }
    });
  });
}

// ===== View Scan =====
async function viewScan(scanId) {
  try {
    const response = await fetch(`/api/scan/${scanId}/report`);
    const data = await response.json();

    const modal = document.getElementById('viewModal');
    const modalTitle = document.getElementById('viewModalTitle');
    const modalBody = document.getElementById('viewModalBody');

    modalTitle.textContent = data.summary.fileName;

    modalBody.innerHTML = `
      <div class="scan-detail-header">
        <div class="scan-detail-file">
          <i data-lucide="file-text"></i>
        </div>
        <div class="scan-detail-info">
          <h3>${escapeHtml(data.summary.fileName)}</h3>
          <p>Scanned: ${formatDate(data.summary.scannedAt)} • ${data.summary.wordCount} words</p>
        </div>
      </div>

      <div class="scan-detail-meta">
        <div class="detail-meta-item">
          <div class="detail-meta-value ${getScoreClass(data.summary.plagiarismScore)}">${data.summary.plagiarismScore}%</div>
          <div class="detail-meta-label">Plagiarism</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-meta-value ${getScoreClass(data.summary.aiScore)}">${data.summary.aiScore}%</div>
          <div class="detail-meta-label">AI Score</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-meta-value">${data.plagiarism.totalMatches}</div>
          <div class="detail-meta-label">Matches</div>
        </div>
        <div class="detail-meta-item">
          <div class="detail-meta-value">${data.aiDetection.confidence}%</div>
          <div class="detail-meta-label">Confidence</div>
        </div>
      </div>

      <div class="verdict-box ${getVerdictClass(data.summary.verdict)}">
        ${data.summary.verdict}
      </div>

      <section class="matches-section">
        <h3><i data-lucide="link"></i> Similarity Matches</h3>
        ${data.plagiarism.matches.length > 0 ? `
          ${data.plagiarism.matches.map(match => `
            <div class="match-item">
              <div class="match-header">
                <span class="match-source">${escapeHtml(match.source)}</span>
                <span class="match-similarity">${match.similarity}% match</span>
              </div>
              <a href="${match.url}" target="_blank" class="match-url">${match.url}</a>
              <p class="match-text">${escapeHtml(match.matchedText)}</p>
            </div>
          `).join('')}
        ` : `
          <div class="no-matches">
            <i data-lucide="shield-check"></i>
            <p>No significant matches found</p>
          </div>
        `}
      </section>

      <section class="indicators-section">
        <h3><i data-lucide="cpu"></i> AI Detection Indicators</h3>
        <div class="indicator-grid">
          <div class="indicator-item">
            <div class="indicator-value">${data.aiDetection.indicators.perplexity || 'N/A'}</div>
            <div class="indicator-label">Perplexity</div>
          </div>
          <div class="indicator-item">
            <div class="indicator-value">${data.aiDetection.indicators.burstiness || 'N/A'}</div>
            <div class="indicator-label">Burstiness</div>
          </div>
          <div class="indicator-item">
            <div class="indicator-value">${data.aiDetection.indicators.repetitionScore || 'N/A'}</div>
            <div class="indicator-label">Repetition</div>
          </div>
          <div class="indicator-item">
            <div class="indicator-value">${data.aiDetection.indicators.transitionScore || 'N/A'}</div>
            <div class="indicator-label">Transitions</div>
          </div>
        </div>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
          ${data.aiDetection.verdict}
        </p>
      </section>
    `;

    lucide.createIcons();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Failed to view scan:', error);
    showToast('Failed to load scan details', 'error');
  }
}

// ===== Delete Scan =====
async function deleteScan(scanId) {
  if (!confirm('Are you sure you want to delete this scan?')) return;

  try {
    const response = await fetch(`/api/history/${scanId}`, { method: 'DELETE' });
    const data = await response.json();

    if (data.success) {
      showToast('Scan deleted', 'success');
      fetchHistory();
      fetchStats();
    } else {
      throw new Error(data.error || 'Delete failed');
    }
  } catch (error) {
    console.error('Delete failed:', error);
    showToast(error.message, 'error');
  }
}

// ===== Clear All =====
document.getElementById('clearAll')?.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete ALL scan history? This cannot be undone.')) return;

  try {
    const response = await fetch('/api/history', { method: 'DELETE' });
    const data = await response.json();

    if (data.success) {
      showToast('All history cleared', 'success');
      fetchHistory();
      fetchStats();
    } else {
      throw new Error(data.error || 'Failed to clear');
    }
  } catch (error) {
    console.error('Clear failed:', error);
    showToast(error.message, 'error');
  }
});

// ===== Filter & Sort =====
document.getElementById('statusFilter')?.addEventListener('change', (e) => {
  currentStatus = e.target.value;
  currentPage = 1;
  fetchHistory();
});

document.getElementById('sortBy')?.addEventListener('change', (e) => {
  currentSortBy = e.target.value;
  currentPage = 1;
  fetchHistory();
});

document.getElementById('sortOrder')?.addEventListener('change', (e) => {
  currentSortOrder = e.target.value;
  currentPage = 1;
  fetchHistory();
});

// ===== Pagination =====
document.getElementById('prevPage')?.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchHistory();
  }
});

document.getElementById('nextPage')?.addEventListener('click', () => {
  currentPage++;
  fetchHistory();
});

// ===== Modal Close =====
document.getElementById('closeViewModal')?.addEventListener('click', () => {
  document.getElementById('viewModal').classList.remove('active');
  document.body.style.overflow = '';
});

document.getElementById('viewModal')?.querySelector('.modal-overlay').addEventListener('click', () => {
  document.getElementById('viewModal').classList.remove('active');
  document.body.style.overflow = '';
});

// ===== Helpers =====
function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '<i data-lucide="check-circle"></i>';
    case 'processing': return '<i data-lucide="loader"></i>';
    case 'failed': return '<i data-lucide="x-circle"></i>';
    default: return '<i data-lucide="clock"></i>';
  }
}

function getScoreClass(score) {
  if (score >= 50) return 'score-high';
  if (score >= 20) return 'score-medium';
  return 'score-low';
}

function getVerdictClass(verdict) {
  if (verdict.includes('High Risk')) return 'verdict-high';
  if (verdict.includes('Moderate')) return 'verdict-medium';
  return 'verdict-low';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '<i data-lucide="check-circle"></i>',
    error: '<i data-lucide="alert-circle"></i>',
    info: '<i data-lucide="info"></i>'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type]} <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.animation = 'toastSlide 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== Background Animation (reuse from main) =====
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.min(60, Math.floor(window.innerWidth * window.innerHeight / 20000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        color: ['#6366f1', '#ec4899', '#06b6d4'][Math.floor(Math.random() * 3)]
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const opacity = (1 - dist / 120) * 0.1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${Math.round(p.opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();
    });

    animationId = requestAnimationFrame(animate);
  }

  function start() {
    resize();
    createParticles();
    animate();
  }

  function stop() {
    if (animationId) cancelAnimationFrame(animationId);
  }

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}

// ===== Initialize =====
initBackground();
fetchStats();
fetchHistory();