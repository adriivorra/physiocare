require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;
const patientsRouter = require('./routes/patients');
const physiosRouter = require('./routes/physios');
const recordsRouter = require('./routes/records');
const nunjucks = require('nunjucks');
const path = require("path");
const methodOverride = require('method-override');

// Configuración de Nunjucks
const env = nunjucks.configure("views", {
    autoescape: true,
    express: app
  });

// Agregar un filtro personalizado para la fecha
env.addFilter('date', function(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Devuelve la fecha en formato YYYY-MM-DD
  });
  
env.addFilter('alldate', function(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Mes en formato 2 dígitos
    const day = String(d.getDate()).padStart(2, '0'); // Día en formato 2 dígitos
    const hours = String(d.getHours()).padStart(2, '0'); // Hora en formato 2 dígitos
    const minutes = String(d.getMinutes()).padStart(2, '0'); // Minutos en formato 2 dígitos
    return `${year}-${month}-${day} ${hours}:${minutes}`;
});
// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));
app.set('view engine', 'njk');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      let method = req.body._method;
      delete req.body._method;
      return method;
    } 
}));
app.use('/patients', patientsRouter);
app.use('/physios', physiosRouter);
app.use('/records', recordsRouter);


mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado a la base de datos physiocare'))
.catch((error) => console.error('Error al conectar a la base de datos:', error));

app.get('/', (req, res) => {
    res.send('Bienvenido a la API de PhysioCare');
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
