const express = require('express');
const User = require('../models/user');
const { generarToken } = require('../auth/auth');
const bcrypt = require('bcrypt');

const router = express.Router();


router.post('/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        const user = await User.findOne({ login });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: "login incorrecto", result: null });
        }

        const token = generarToken({ _id: user._id, login: user.login, rol: user.rol });
        res.status(200).json({ error: null, result: token });
    } catch (error) {
        res.status(500).json({ error: error.message, result: null });
    }
});

module.exports = router;
