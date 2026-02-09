const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get('/status', (req, res) => {
    res.json({ ok: true });
});

// Serve index.html explicitly at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Use PORT from env (Kubernetes) or default 80
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Frontend running on ${PORT}`));