const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'botbuilder_secret_2024';

router.get('/jwt-test', (req, res) => {
  try {
    // Info sobre JWT_SECRET
    const secretInfo = {
      exists: !!process.env.JWT_SECRET,
      length: SECRET.length,
      firstChars: SECRET.substring(0, 10) + '...',
      usingDefault: !process.env.JWT_SECRET,
    };

    // Generar un token de prueba
    const testPayload = { test: true, timestamp: Date.now() };
    const testToken = jwt.sign(testPayload, SECRET, { expiresIn: '1h' });

    // Verificar el token
    let verified = null;
    let verifyError = null;
    try {
      verified = jwt.verify(testToken, SECRET);
    } catch (err) {
      verifyError = err.message;
    }

    res.json({
      status: 'ok',
      secret: secretInfo,
      tokenGeneration: {
        success: !!testToken,
        tokenPreview: testToken.substring(0, 50) + '...',
      },
      tokenVerification: {
        success: !!verified,
        error: verifyError,
        payload: verified,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Test con token del header
router.get('/verify-my-token', (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;

  if (!token) {
    return res.json({
      status: 'no_token',
      message: 'No hay token en el header Authorization',
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({
      status: 'valid',
      message: 'Token válido',
      payload: decoded,
    });
  } catch (error) {
    res.json({
      status: 'invalid',
      message: 'Token inválido',
      error: error.message,
      secretUsed: SECRET.substring(0, 10) + '...',
    });
  }
});

module.exports = router;
