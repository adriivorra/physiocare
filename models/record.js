const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    physio: { type: mongoose.Schema.Types.ObjectId, ref: 'Physio', required: true },
    diagnosis: { type: String, required: true, minlength: 10, maxlength: 500 },
    treatment: { type: String, required: true },
    observations: { type: String, maxlength: 500 }
});

const recordSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, unique: true },
    medicalRecord: { type: String, maxlength: 1000 },
    appointments: [appointmentSchema]
});

module.exports = mongoose.model('Record', recordSchema);
