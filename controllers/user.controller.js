const { pool } = require("../db")
const bcrypt = require("bcryptjs")

// Obtener todos los usuarios (solo admin)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query("SELECT id, username, email, role, active, created_at FROM users")

    res.status(200).json(users)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener un usuario por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    const [users] = await pool.query("SELECT id, username, email, role, active, created_at FROM users WHERE id = ?", [
      id,
    ])

    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    res.status(200).json(users[0])
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Desactivar un usuario (solo admin)
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que no se esté desactivando a sí mismo
    if (Number.parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "No puedes desactivar tu propia cuenta" })
    }

    // Verificar que el usuario existe
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [id])

    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    // Desactivar usuario
    await pool.query("UPDATE users SET active = false WHERE id = ?", [id])

    res.status(200).json({ message: "Usuario desactivado correctamente" })
  } catch (error) {
    console.error("Error al desactivar usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Activar un usuario (solo admin)
const activateUser = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que el usuario existe
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [id])

    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    // Activar usuario
    await pool.query("UPDATE users SET active = true WHERE id = ?", [id])

    res.status(200).json({ message: "Usuario activado correctamente" })
  } catch (error) {
    console.error("Error al activar usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  deactivateUser,
  activateUser,
}
