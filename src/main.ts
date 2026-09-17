const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement | null;
const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement | null;
const statusMsg = document.getElementById('upload-status');

// Trigger file picker
uploadBtn?.addEventListener('click', () => {
  fileInput?.click();
});

// File selection & upload to proxy
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
    } else {
      const err = await response.json().catch(() => ({}));
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

// Handle Search Input
searchInput?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  console.log('Searching for:', target.value);
});