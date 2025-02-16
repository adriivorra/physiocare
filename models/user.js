const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    login: { type: String, required: true, minlength: 4, unique: true },
    password: { type: String, required: true, minlength: 7 },
    rol: { type: String, required: true, enum: ['admin', 'physio', 'patient'] }
});

module.exports = mongoose.model('User', userSchema);
