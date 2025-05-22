const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { pool } = require("../db")

// Registrar un nuevo usuario
const register = async (req, res) => {
  try {
    const { username, password, email } = req.body

    // Validar datos
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" })
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query("SELECT * FROM users WHERE username = ? OR email = ?", [username, email])

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "El nombre de usuario o email ya está en uso" })
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Crear usuario
    const [result] = await pool.query("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)", [
      username,
      hashedPassword,
      email,
      "client",
    ])

    // Generar token JWT
    const token = jwt.sign(
      { id: result.insertId, username, role: "client" },
      process.env.JWT_SECRET || "cinema_secret_key",
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    )

    res.status(201).json({
      message: "Usuario registrado correctamente",
      token,
      user: {
        id: result.insertId,
        username,
        email,
        role: "client",
      },
    })
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Iniciar sesión
const login = async (req, res) => {
  try {
    const { username, password } = req.body

    // Validar datos
    if (!username || !password) {
      return res.status(400).json({ message: "Nombre de usuario y contraseña son obligatorios" })
    }

    // Buscar usuario
    const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username])

    if (users.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" })
    }

    const user = users[0]

    // Verificar si el usuario está activo
    if (!user.active) {
      return res.status(401).json({ message: "Esta cuenta ha sido desactivada" })
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciales inválidas" })
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "cinema_secret_key",
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    )

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error al iniciar sesión:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Verificar token
const verifyAuth = (req, res) => {
  res.status(200).json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  })
}

module.exports = {
  register,
  login,
  verifyAuth,
}
