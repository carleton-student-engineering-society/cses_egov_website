// Add this GET route in proxy/server.js before app.listen(...)
app.get('/api/pdfs', async (req, res) => {
    if (!NC_USER || !NC_PASS) {
      return res.status(500).json({ error: 'Server missing Nextcloud credentials configuration' });
    }
  
    const targetFolderUrl = `${NC_WEBDAV_BASE}/${encodeURIComponent(NC_USER)}/Governance_Uploads/`;
    const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
  
    try {
      // PROPFIND request to list files in Nextcloud WebDAV directory
      const ncRes = await fetch(targetFolderUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Depth': '1',
        },
      });
  
      if (!ncRes.ok) {
        if (ncRes.status === 404) return res.json([]); // Folder doesn't exist yet
        throw new Error(`Nextcloud PROPFIND failed: ${ncRes.statusText}`);
      }
  
      const xmlText = await ncRes.text();
      // Simple regex parse for filenames ending in .pdf from WebDAV XML response
      const regex = /<d:href>.*?\/Governance_Uploads\/([^<]+)<\/d:href>/gi;
      const files = [];
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        const decodedName = decodeURIComponent(match);
        if (decodedName.toLowerCase().endsWith('.pdf')) {
          files.push({ name: decodedName, url: `${targetFolderUrl}${encodeURIComponent(decodedName)}` });
        }
      }
  
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Endpoint to download/view raw PDF bytes safely authenticated via proxy if needed, 
  // or use public share link. Direct link preview:
  app.get('/api/pdf-file/:filename', async (req, res) => {
    const targetUrl = `${NC_WEBDAV_BASE}/${encodeURIComponent(NC_USER)}/Governance_Uploads/${encodeURIComponent(req.params.filename)}`;
    const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
    const ncRes = await fetch(targetUrl, { headers: { 'Authorization': authHeader } });
    if (!ncRes.ok) return res.status(ncRes.status).send('Not found');
    res.setHeader('Content-Type', 'application/pdf');
    ncRes.body.pipe(res);
  });