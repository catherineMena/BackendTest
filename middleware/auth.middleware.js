const jwt = require("jsonwebtoken")
const { pool } = require("../db")

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "No se proporcionó token de autenticación" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "cinema_secret_key")
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }
}

// Middleware para verificar rol de administrador
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    return res.status(403).json({ message: "Acceso denegado. Se requiere rol de administrador" })
  }
}

// Middleware para verificar si el usuario está activo
const isActive = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT active FROM users WHERE id = ?", [req.user.id])

    if (rows.length === 0 || !rows[0].active) {
      return res.status(403).json({ message: "Cuenta de usuario desactivada" })
    }

    next()
  } catch (error) {
    console.error("Error al verificar estado del usuario:", error)
    return res.status(500).json({ message: "Error interno del servidor" })
  }
}

module.exports = {
  verifyToken,
  isAdmin,
  isActive,
}
