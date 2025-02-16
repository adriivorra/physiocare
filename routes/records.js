const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const Patient = require('../models/patient');
const Physio = require('../models/physio');

router.get('/find', async (req, res) => {
    try {
        const allRecords = await Record.find()
            .populate({
                path: 'patient',
                match: { surname: { $regex: req.query.surname } }
            });

        const records = allRecords.filter(record => record.patient !== null);

        if (records.length === 0) {
            return res.render('error', { message: 'No se encontraron expedientes asociados al apellido ingresado.' });
        }

        // Renderizamos la vista con los expedientes encontrados
        res.render('records/records_list', { records });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Hubo un problema al procesar la búsqueda. Inténtelo más tarde.' });
    }
});

// Mostrar formulario para registrar expediente médico
router.get('/new', async (req, res) => {
    try {
        // Obtener todos los pacientes
        const allPatients = await Patient.find();

        // Obtener los IDs de los pacientes que ya tienen expedientes médicos
        const records = await Record.find({}, { patient: 1 });
        const patientsWithRecords = records.map(record => record.patient.toString());

        // Filtrar solo los pacientes que no tienen expedientes
        const patientsWithoutRecords = allPatients.filter(
            patient => !patientsWithRecords.includes(patient._id.toString())
        );

        res.render('records/records_add.njk', { patients: patientsWithoutRecords });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Error al cargar los pacientes' });
    }
});

router.get('/:id/appointments/new', async (req, res) => {
    try {
        // Obtener el expediente médico correspondiente al ID
        const record = await Record.findById(req.params.id).populate("patient");
        
        if (!record) {
            return res.render('error', { error: 'Expediente no encontrado.' });
        }

        // Obtener todos los fisioterapeutas para seleccionar en el formulario
        const physios = await Physio.find();

        res.render('records/appointments/new', { record, physios });
    } catch (error) {
        console.error(error);
        res.render('error', { error: 'Hubo un error al cargar el formulario de citas.' });
    }
});

router.post('/:id/appointments', async (req, res) => {
    try {
        const { date, physio, diagnosis, treatment, observations } = req.body;

        // Crear una nueva cita
        const newAppointment = {
            date,
            physio,
            diagnosis,
            treatment,
            observations
        };

        // Buscar el expediente médico y agregar la cita
        const record = await Record.findById(req.params.id).populate("patient");

        if (!record) {
            return res.render('error', { error: 'Expediente no encontrado.' });
        }

        // Agregar la cita al expediente
        record.appointments.push(newAppointment);
        await record.save();

        // Redirigir a la vista de detalle del expediente
        res.redirect(`/records/${record.patient._id}`);
    } catch (error) {
        console.error(error);
        res.render('appointments/new', {
            record: req.body,
            errors: ['Hubo un error al guardar la cita. Por favor, inténtelo nuevamente.']
        });
    }
});

// Registrar expediente médico
router.post('/', async (req, res) => {
    try {
        const { patientId, medicalRecord, appointments } = req.body;

        // Verificar que el paciente exista
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.render('records/records_add.njk', {
                errors: ['Paciente no encontrado'],
                old: req.body
            });
        }

        // Procesar citas: Convertir las citas en objetos de MongoDB
        const processedAppointments = await Promise.all(appointments.map(async (appointment) => {
            const physio = await Physio.findById(appointment.physio);
            return {
                date: appointment.date,
                physio: physio._id,
                diagnosis: appointment.diagnosis,
                treatment: appointment.treatment,
                observations: appointment.observations
            };
        }));

        // Crear nuevo expediente médico
        const newRecord = new Record({
            patient: patientId,
            medicalRecord,
            appointments: processedAppointments
        });

        // Guardar expediente médico
        await newRecord.save();

        // Redirigir a la vista de listado de expedientes
        res.redirect('/records');
    } catch (error) {
        console.error(error);
        res.render('records/records_add.njk', {
            errors: ['Hubo un error al registrar el expediente. Inténtalo nuevamente.'],
            old: req.body
        });
    }
});

router.get("/", async (req, res) => {
    try {
        // Obtener todos los expedientes médicos
        const records = await Record.find().populate('patient');

        // Filtrar los expedientes que no tienen pacientes válidos
        const validRecords = await Promise.all(records.map(async (record) => {
            // Comprobar si el paciente existe y no ha sido eliminado
            const patientExists = record.patient && !record.patient.isDeleted;
            if (patientExists) {
                return record;  // Si el paciente es válido, mantener el expediente
            }
            return null;  // Si el paciente no es válido, eliminar el expediente de la lista
        }));

        // Filtrar nulls (expedientes con pacientes eliminados o inexistentes)
        const finalRecords = validRecords.filter(record => record !== null);

        // Si no hay expedientes válidos
        if (finalRecords.length === 0) {
            return res.render("error.njk", { message: "No se encontraron expedientes médicos válidos." });
        }

        // Renderizar la lista de expedientes válidos
        res.render("records/records_list.njk", { records: finalRecords });
    } catch (error) {
        console.error(error);
        res.status(500).render("error.njk", { message: "Error interno del servidor." });
    }
});


// Detalle de un expediente médico específico
router.get("/:id", async (req, res) => {
    try {
        const record = await Record.findOne({ patient: req.params.id })
            .populate('patient')
            .populate({
                path: 'appointments.physio',
                select: '_id name specialty' // Cargar información del fisioterapeuta
            });

        if (!record) {
            return res.render("error.njk", { message: "Expediente no encontrado." });
        }

        res.render("records/record_detail.njk", { record });
    } catch (error) {
        res.status(500).render("error.njk", { message: "Error interno del servidor." });
    }
});

module.exports = router;
