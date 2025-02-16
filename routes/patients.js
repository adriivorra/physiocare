const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const multer = require('multer');
const validator = require('validator');

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "_" + file.originalname)
    }
  })

let upload = multer({storage: storage});

// Eliminar un paciente
router.delete('/:id', async (req, res) => {
    try {
        const deletedPatient = await Patient.findByIdAndDelete(req.params.id);
        if (!deletedPatient) {
            res.render('error.njk', { message: 'El paciente no existe.'});
        }
       
        res.redirect('/patients');
    } catch (error) {
        res.render("error.njk", { message: error });
    }
});


router.get('/find', async (req, res) => {
    try {
        const { surname } = req.query; // Obtenemos el apellido de la consulta

        let patients;

        if (surname) {
            // Buscamos pacientes que coincidan con el apellido (usando un regex para hacer la búsqueda más flexible)
            patients = await Patient.find({ surname: { $regex: surname, $options: 'i' } });
            
            if (patients.length === 0) {
                // Si no se encuentran pacientes, renderizamos una vista de error
                return res.render('error', { message: 'No se encontraron pacientes asociados al apellido ingresado.' });
            }
        } else {
            // Si no se especifica un apellido, devolvemos todos los pacientes
            patients = await Patient.find();
        }

        // Renderizamos la vista con la lista de pacientes encontrados
        res.render('patients/patients_list', { patients });
    } catch (error) {
        res.render('error', { message: 'Hubo un problema al procesar la búsqueda. Inténtelo más tarde.' });
    }
});



// Formulario inserción
router.get("/new", async (req, res) => {
    res.render("patients/patient_add.njk");
});

// Formulario edición
router.get('/:id/edit', (req, res) => {
    Patient.findById(req.params['id'])
        .then(patient => {
            if (patient) {
                res.render('patients/patient_edit', { patient });
            } else {
                res.render('error', { message: "Paciente no encontrado" });
            }
        })
        .catch(error => {
            console.error(error);
            res.render('error', { message: "Ocurrió un error al buscar el paciente." });
        });
});


// Listado de pacientes
router.get("/", async (req, res) => {
    try {
        const patients = await Patient.find();
        if (patients.length === 0) {
            return res.render("error.njk", { message: "No hay pacientes en el sistema." });
        }

        res.render("patients/patients_list.njk", { patients });
    } catch (error) {
        res.status(500).render("error.njk", { message: "Error interno del servidor." });
    }
});


// Detalle de un paciente específico
router.get("/:id", async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.render("error.njk", { message: "Paciente no encontrado." });
        }

        res.render("patients/patient_detail.njk", { patient });
    } catch (error) {
        res.status(500).render("error.njk", { message: error });
    }
});

router.get('/:id/edit', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).send('Paciente no encontrado');
        }

        res.render('patients/patient_edit.njk', { patient });
    } catch (error) {
        console.error(error);
        res.redirect('/patients');
    }
});

router.post('/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { name, surname, birthDate, address, insuranceNumber, imagen } = req.body;

        // Validación de los campos antes de procesar
        let errors = [];

        if (validator.isEmpty(name) || !validator.isLength(name, { min: 2, max: 50 })) {
            errors.push("El nombre debe tener entre 2 y 50 caracteres.");
        }
        if (validator.isEmpty(surname) || !validator.isLength(surname, { min: 2, max: 50 })) {
            errors.push("Los apellidos deben tener entre 2 y 50 caracteres.");
        }
        if (!validator.isDate(birthDate)) {
            errors.push("La fecha de nacimiento no es válida.");
        }
        if (validator.isEmpty(insuranceNumber) || !validator.isLength(insuranceNumber, { min: 9, max: 9 }) || !validator.matches(insuranceNumber, /^[a-zA-Z0-9]{9}$/)) {
            errors.push("El número de seguro debe tener 9 caracteres alfanuméricos.");
        }

        if (errors.length > 0) {
            return res.render('patients/patient_edit.njk', {
                errors: errors,
                patient: req.body
            });
        }

        // Si pasa la validación, se procesa la actualización
        const image = req.file ? req.file.filename : imagen;

        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { name, surname, birthDate, address, insuranceNumber, image },
            { new: true, runValidators: true } // Retorna el paciente actualizado y aplica validaciones
        );

        if (!patient) {
            res.render("error.njk", { message: 'Paciente no encontrado' });
        }

        res.redirect(`/patients/${patient._id}`);
    } catch (error) {
        console.error(error);
        res.render('patients/patient_edit.njk', {
            errors: ['Hubo un error al actualizar el paciente. Por favor, inténtelo nuevamente.'],
            patient: req.body
        });
    }
});

// Insertar un paciente con validaciones
router.post('/', upload.single('imagen'), async (req, res) => {
    try {
        // Obtener los datos del formulario
        const { name, surname, birthDate, address, insuranceNumber, username, password } = req.body;

        // Validación de nombre
        if (validator.isEmpty(name) || !validator.isLength(name, { min: 2, max: 50 })) {
            return res.render('patients/patient_add.njk', {
                errors: ['El nombre debe tener entre 2 y 50 caracteres.'],
                old: req.body
            });
        }

        // Validación de apellido
        if (validator.isEmpty(surname) || !validator.isLength(surname, { min: 2, max: 50 })) {
            return res.render('patients/patient_add.njk', {
                errors: ['El apellido debe tener entre 2 y 50 caracteres.'],
                old: req.body
            });
        }

        // Validación de la fecha de nacimiento
        if (!validator.isDate(birthDate)) {
            return res.render('patients/patient_add.njk', {
                errors: ['La fecha de nacimiento no es válida.'],
                old: req.body
            });
        }

        // Validación del número de seguro
        if (!validator.matches(insuranceNumber, /^[a-zA-Z0-9]{9}$/)) {
            return res.render('patients/patient_add.njk', {
                errors: ['El número de seguro debe tener 9 caracteres alfanuméricos.'],
                old: req.body
            });
        }

        // Validación del nombre de usuario
        if (validator.isEmpty(username) || !validator.isLength(username, { min: 3, max: 50 })) {
            return res.render('patients/patient_add.njk', {
                errors: ['El nombre de usuario debe tener entre 3 y 50 caracteres.'],
                old: req.body
            });
        }

        // Validación de la contraseña
        if (validator.isEmpty(password) || !validator.isLength(password, { min: 6, max: 20 })) {
            return res.render('patients/patient_add.njk', {
                errors: ['La contraseña debe tener entre 6 y 20 caracteres.'],
                old: req.body
            });
        }

        // Hashear la contraseña de forma asíncrona
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear un nuevo usuario
        const newUser = new User({ login: username, password: hashedPassword, rol: 'patient' });
        const savedUser = await newUser.save();

        // Crear un nuevo paciente con el ID del usuario creado
        const newPatient = new Patient({
            name,
            surname,
            birthDate,
            address,
            insuranceNumber,
            image: req.file ? req.file.filename : "", // Si no hay imagen, se queda como undefined
            _id: savedUser._id
        });
        const savedPatient = await newPatient.save();

        // Redirigir a la lista de pacientes o a la vista de detalles del paciente
        res.redirect('/patients');
    } catch (error) {
        console.error(error);
        res.render('patients/patient_add.njk', {
            errors: ['Hubo un error al registrar el paciente. Por favor, inténtelo nuevamente.'],
            old: req.body
        });
    }
});


module.exports = router;
