app.get('/api/pdfs', async (req, res) => {
    if (!NC_USER || !NC_PASS) {
      return res.status(500).json({ error: 'Server missing Nextcloud credentials configuration' });
    }
  
    const targetFolderUrl = `${NC_WEBDAV_BASE}/${encodeURIComponent(NC_USER)}/PDF_Upload/`;
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
        if (ncRes.status === 404) return res.json([]); // Folder doesn't exist yet
        throw new Error(`Nextcloud PROPFIND failed: ${ncRes.statusText}`);
      }
  
      const xmlText = await ncRes.text();
      const regex = /<[^>]*href[^>]*>.*?\/PDF_Upload\/([^<]+)<\/[^>]*href>/gi;
      const files = [];
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        const decodedName = decodeURIComponent(match).trim();
        if (decodedName && decodedName.toLowerCase().endsWith('.pdf') && decodedName !== 'PDF_Upload') {
          files.push({ name: decodedName, url: `${targetFolderUrl}${encodeURIComponent(decodedName)}` });
        }
      }
      
      const uniqueFiles = Array.from(new Map(files.map(item => [item.name, item])).values());
    res.json(uniqueFiles);
    } catch (err) {
        console.error('PROPFIND error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  
  app.get('/api/pdf-file/:filename', async (req, res) => {
    try {
        const targetUrl = `${NC_WEBDAV_BASE}/${encodeURIComponent(NC_USER)}/PDF_Upload/${encodeURIComponent(req.params.filename)}`;
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
    }
  );