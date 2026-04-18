require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from project root
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gdl', require('./routes/portada')('gdl'));
app.use('/api/mty', require('./routes/portada')('mty'));
app.use('/api/gdl', require('./routes/vacantes')('gdl'));
app.use('/api/mty', require('./routes/vacantes')('mty'));
app.use('/api/contacto', require('./routes/contacto'));

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Solo Empleos API corriendo en puerto ${PORT}`);
});
