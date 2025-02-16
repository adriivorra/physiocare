const express = require('express');
const router = express.Router();
const Physio = require('../models/physio');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const multer = require('multer');

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "_" + file.originalname)
    }
  })

let upload = multer({storage: storage});


router.get('/new', (req, res) => {
    res.render('physios/physio_add.njk');
});

router.get('/find', async (req, res) => {
    try {
        const { specialty } = req.query; // Obtenemos la especialidad de la consulta

        let physios;

        if (specialty) {
            // Buscamos fisioterapeutas que coincidan con la especialidad (usando un regex para hacer la búsqueda más flexible)
            physios = await Physio.find({ specialty: { $regex: specialty, $options: 'i' } });
            
            if (physios.length === 0) {
                // Si no se encuentran fisioterapeutas, renderizamos una vista de error
                return res.render('error', { message: 'No se encontraron fisioterapeutas con la especialidad indicada.' });
            }
        } else {
            // Si no se especifica especialidad, devolvemos todos los fisioterapeutas
            physios = await Physio.find();
        }

        // Renderizamos la vista con la lista de fisioterapeutas encontrados
        res.render('physios/physios_list', { physios });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Hubo un problema al procesar la búsqueda. Inténtelo más tarde.' });
    }
});

// Insertar un nuevo fisio
router.post('/', upload.single('imagen'), async (req, res) => {
    try {
        const { login, password, ...physioData } = req.body;

        const hashedPassword = await bcrypt.hashSync(password, 10);
        const newUser = new User({ login, password: hashedPassword, rol: 'physio' });
        const savedUser = await newUser.save();

        const newPhysio = new Physio({ ...physioData, _id: savedUser._id, image: req.file ? req.file.filename : "" });
        const savedPhysio = await newPhysio.save();
        
        res.redirect('/physios');
    } catch (error) {
        res.render('physios/physio_add.njk', {
            errors: ['Error al registrar el fisioterapeuta. Por favor, inténtelo de nuevo.'],
            old: req.body
        });
    }
});


// Listado de fisioterapeutas
router.get("/", async (req, res) => {
    try {
        const physios = await Physio.find();
        if (physios.length === 0) {
            return res.render("error.njk", { message: "No hay fisios en el sistema." });
        }

        res.render("physios/physios_list.njk", { physios });
    } catch (error) {
        res.status(500).render("error.njk", { message: "Error interno del servidor." });
    }
});


// Detalle de un fisioterapeuta específico
router.get("/:id", async (req, res) => {
    try {
        const physio = await Physio.findById(req.params.id);
        if (!physio) {
            return res.render("error.njk", { message: "Fisio no encontrado." });
        }

        res.render("physios/physio_detail.njk", { physio });
    } catch (error) {
        res.render("error.njk", { message: "Error interno del servidor." });
    }
});

// Eliminar un fisio
router.delete('/:id', async (req, res) => {
    try {
        const deletedPhysio = await Physio.findByIdAndDelete(req.params.id);
        if (!deletedPhysio) {
            res.render("error.njk", { message: "Physio no encontrado" });
        }
        res.redirect('/physios');
    } catch (error) {
        res.render("error.njk", { message: error });
    }
});


// Ruta para renderizar el formulario de edición con los datos actuales del fisioterapeuta
router.get('/:id/edit', async (req, res) => {
    try {
        const physio = await Physio.findById(req.params.id);
        if (physio) {
            res.render('physios/physio_edit.njk', { physio });
        } else {
            res.render('error', { error: 'Fisioterapeuta no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.render('error', { error: 'Error al cargar los datos del fisioterapeuta' });
    }
});

// Ruta para actualizar la información del fisioterapeuta
router.post('/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { name, surname, specialty, licenseNumber, imagen } = req.body;

        const image = req.file ? req.file.filename : imagen;

        const updatedPhysio = await Physio.findByIdAndUpdate(
            req.params.id,
            { name, surname, specialty, licenseNumber, image },
            { new: true }
        );
        if (updatedPhysio) {
            res.redirect(`/physios/${updatedPhysio._id}`);  // Redirige a los detalles del fisioterapeuta
        } else {
            res.render('error', { error: 'Fisioterapeuta no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.render('physios/physio_edit.njk', { 
            error: 'Hubo un problema al actualizar los datos del fisioterapeuta', 
            physio: req.body 
        });
    }
});
  
module.exports = router;
