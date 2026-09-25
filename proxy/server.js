require('dotenv').config();
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { Readable } = require('stream');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

const NC_USER = process.env.NC_USER;
const NC_PASS = process.env.NC_PASS;
const NC_WEBDAV_BASE = process.env.NC_WEBDAV_BASE;

const ncConfig = {
  auth: {
    username: NC_USER,
    password: NC_PASS,
  },
  headers: {
    'Content-Type': 'application/octet-stream',
  },
};

// Endpoint for main.ts upload handler
app.post('/api/upload-governance-pdf', upload.single('file'), async (req, res) => {
  if (!NC_USER || !NC_PASS || !NC_WEBDAV_BASE) {
    return res.status(500).json({ error: 'Server missing Nextcloud configuration' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const targetUrl = `${NC_WEBDAV_BASE}/PDF_Upload/${encodeURIComponent(req.file.originalname)}`;
  try {
    const response = await axios.put(targetUrl, req.file.buffer, {
      ...ncConfig,
      headers: {
        'Content-Type': req.file.mimetype || 'application/octet-stream',
      },
    });
    res.status(response.status).json({ message: 'Upload successful' });
  } catch (error) {
    console.error('WebDAV upload error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// List PDFs from PDF_Upload folder (PROPFIND)
app.get('/api/pdfs', async (req, res) => {
  if (!NC_USER || !NC_PASS || !NC_WEBDAV_BASE) {
    return res.status(500).json({ error: 'Server missing Nextcloud configuration' });
  }

  const targetFolderUrl = `${NC_WEBDAV_BASE}/PDF_Upload/`;
  const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');

  try {
    const ncRes = await fetch(targetFolderUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Depth': '1',
      },
    });

    if (!ncRes.ok) {
      if (ncRes.status === 404) return res.json([]);
      throw new Error(`Nextcloud PROPFIND failed: ${ncRes.statusText}`);
    }

    const xmlText = await ncRes.text();
    const regex = /<[^>]*href[^>]*>.*?\/PDF_Upload\/([^<]+)<\/[^>]*href>/gi;
    const files = [];
    let match;
    while ((match = regex.exec(xmlText)) !== null) {
      const decodedName = decodeURIComponent(match[1]).trim();
      if (decodedName && decodedName.toLowerCase().endsWith('.pdf') && decodedName !== 'PDF_Upload') {
        files.push({ name: decodedName, url: `/api/pdf-file/${encodeURIComponent(decodedName)}` });
      }
    }
    
    const uniqueFiles = Array.from(new Map(files.map(item => [item.name, item])).values());
    res.json(uniqueFiles);
  } catch (err) {
    console.error('PROPFIND error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stream specific PDF file
app.get('/api/pdf-file/:filename', async (req, res) => {
  try {
    const targetUrl = `${NC_WEBDAV_BASE}/PDF_Upload/${encodeURIComponent(req.params.filename)}`;
    const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
    const ncRes = await fetch(targetUrl, { headers: { 'Authorization': authHeader } });

    if (!ncRes.ok) return res.status(ncRes.status).send('Not found');
    res.setHeader('Content-Type', 'application/pdf');

    if (ncRes.body) {
      if (typeof ncRes.body.pipe === 'function') {
        ncRes.body.pipe(res);
      } else {
        Readable.fromWeb(ncRes.body).pipe(res);
      }
    } else {
      const buf = Buffer.from(await ncRes.arrayBuffer());
      res.send(buf);
    }
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).send('Error streaming PDF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express proxy running on port ${PORT}`);
});