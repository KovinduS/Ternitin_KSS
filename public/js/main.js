/* ==========================================
   TERNITIN - MAIN FRONTEND LOGIC
   Interactive UI, animations, file upload
   ========================================== */

// ===== Theme Management =====
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  lucide.createIcons();
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

// ===== Background Animation =====
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
    const count = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 15000));

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

    // Draw connections
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

    // Draw and update particles
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

initBackground();

// ===== Scroll Animations =====
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .step, .float-card, .stat-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

initScrollAnimations();

// ===== File Upload Handling =====
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const uploadPreview = document.getElementById('uploadPreview');
const previewName = document.getElementById('previewName');
const previewSize = document.getElementById('previewSize');
const removeFileBtn = document.getElementById('removeFile');
const scanBtn = document.getElementById('scanBtn');

let selectedFile = null;

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function validateFile(file) {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (!allowedTypes.includes(file.type)) {
    showToast('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.', 'error');
    return false;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast('File too large. Maximum size is 10MB.', 'error');
    return false;
  }

  return true;
}

function handleFileSelect(file) {
  if (!validateFile(file)) return;

  selectedFile = file;
  uploadContent.hidden = true;
  uploadPreview.hidden = false;
  previewName.textContent = file.name;
  previewSize.textContent = formatFileSize(file.size);
  scanBtn.disabled = false;
  uploadZone.classList.add('has-file');
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  uploadContent.hidden = false;
  uploadPreview.hidden = true;
  scanBtn.disabled = true;
  uploadZone.classList.remove('has-file');
}

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');

  if (e.dataTransfer.files.length) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// Click to browse
uploadZone.addEventListener('click', (e) => {
  if (e.target === uploadZone || e.target === uploadContent || uploadContent.contains(e.target)) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleFileSelect(e.target.files[0]);
  }
});

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearFile();
});

// ===== Scan Processing =====
scanBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const btnText = scanBtn.querySelector('.btn-text');
  const btnLoading = scanBtn.querySelector('.btn-loading');

  scanBtn.disabled = true;
  btnText.hidden = true;
  btnLoading.hidden = false;

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    // Upload file
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadResponse.json();

    if (!uploadData.success) {
      throw new Error(uploadData.error || 'Upload failed');
    }

    const scanId = uploadData.scanId;
    showToast('File uploaded. Starting analysis...', 'info');

    // Poll for results
    await pollResults(scanId);

  } catch (error) {
    console.error('Scan error:', error);
    showToast(error.message, 'error');
    resetScanButton();
  }
});

async function pollResults(scanId) {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    try {
      const response = await fetch(`/api/upload/${scanId}/status`);
      const data = await response.json();

      if (data.status === 'completed') {
        const results = await fetch(`/api/scan/${scanId}/report`).then(r => r.json());
        showResultsModal(results);
        resetScanButton();
        clearFile();
        return;
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  throw new Error('Analysis timed out. Please try again.');
}

function resetScanButton() {
  const btnText = scanBtn.querySelector('.btn-text');
  const btnLoading = scanBtn.querySelector('.btn-loading');
  scanBtn.disabled = false;
  btnText.hidden = false;
  btnLoading.hidden = true;
}

// ===== Results Modal =====
const resultsModal = document.getElementById('resultsModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

function showResultsModal(data) {
  const { summary, plagiarism, aiDetection } = data;

  modalBody.innerHTML = `
    <div class="result-summary">
      <div class="result-metric">
        <div class="metric-label">Plagiarism Score</div>
        <div class="metric-score ${getScoreClass(plagiarism.score)}">${plagiarism.score}%</div>
      </div>
      <div class="result-metric">
        <div class="metric-label">AI Probability</div>
        <div class="metric-score ${getScoreClass(aiDetection.score)}">${aiDetection.score}%</div>
      </div>
    </div>

    <div class="verdict-box ${getVerdictClass(summary.verdict)}">
      ${summary.verdict}
    </div>

    <section class="matches-section">
      <h3><i data-lucide="link"></i> Similarity Matches</h3>
      ${plagiarism.matches.length > 0 ? `
        ${plagiarism.matches.map(match => `
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
          <div class="indicator-value">${aiDetection.indicators.perplexity || 'N/A'}</div>
          <div class="indicator-label">Perplexity</div>
        </div>
        <div class="indicator-item">
          <div class="indicator-value">${aiDetection.indicators.burstiness || 'N/A'}</div>
          <div class="indicator-label">Burstiness</div>
        </div>
        <div class="indicator-item">
          <div class="indicator-value">${aiDetection.indicators.repetitionScore || 'N/A'}</div>
          <div class="indicator-label">Repetition</div>
        </div>
        <div class="indicator-item">
          <div class="indicator-value">${aiDetection.indicators.transitionScore || 'N/A'}</div>
          <div class="indicator-label">Transitions</div>
        </div>
      </div>
      <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
        Confidence: ${aiDetection.confidence}% • ${aiDetection.verdict}
      </p>
    </section>
  `;

  lucide.createIcons();
  resultsModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideResultsModal() {
  resultsModal.classList.remove('active');
  document.body.style.overflow = '';
}

closeModal.addEventListener('click', hideResultsModal);
resultsModal.querySelector('.modal-overlay').addEventListener('click', hideResultsModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && resultsModal.classList.contains('active')) {
    hideResultsModal();
  }
});

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Toast Notifications =====
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

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});