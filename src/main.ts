const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement | null;
const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement | null;
const statusMsg = document.getElementById('upload-status');
const pdfGrid = document.getElementById('pdf-grid');

let allPdfs: Array<{ name: string; url: string }> = [];

async function loadPdfs() {
  try {
    const res = await fetch('/api/pdfs');
    if (res.ok) {
      allPdfs = await res.json();
      renderPdfGrid(allPdfs);
    }
  } catch (err) {
    console.error('Failed to load PDFs:', err);
  }
}

function renderPdfGrid(items: Array<{ name: string; url: string }>, filterQuery = '') {
  if (!pdfGrid) return;
  const filtered = items.filter(p => p.name.toLowerCase().includes(filterQuery.toLowerCase()));

  if (filtered.length === 0) {
    pdfGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-6 text-sm">No PDFs found</div>`;
    return;
  }

  pdfGrid.innerHTML = filtered.map(pdf => `
    <a href="/api/pdf-file/${encodeURIComponent(pdf.name)}" target="_blank" 
       class="aspect-square bg-[#222831] rounded-lg p-6 flex flex-col items-center justify-center text-center hover:opacity-90 transition-opacity shadow-sm">
      <div class="text-sm font-medium text-white line-clamp-3">
        ${escapeHtml(pdf.name)}
      </div>
    </a>
  `).join('');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

loadPdfs();

// Trigger file picker
uploadBtn?.addEventListener('click', () => {
  fileInput?.click();
});

// Handle file selection & upload to proxy
fileInput?.addEventListener('change', async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    if (statusMsg) statusMsg.textContent = 'Please select a valid PDF file.';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';
    }
    if (statusMsg) statusMsg.textContent = `Uploading ${file.name}...`;

    const response = await fetch('/api/upload-governance-pdf', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      if (statusMsg) statusMsg.textContent = `Uploaded ${file.name} successfully!`;
      await loadPdfs();
    } else {
      const err = await response.json().catch(() => ({}));
      console.log(err.body)
      throw new Error(err.error || `Status ${response.status}`);
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    if (statusMsg) statusMsg.textContent = `Upload failed: ${error.message}`;
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '↑ upload';
    }
    target.value = '';
  }
});

// Handle Search Input Typing
searchInput?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  renderPdfGrid(allPdfs, target.value);
});