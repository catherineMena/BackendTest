const mysql = require("mysql2/promise")
require("dotenv").config()

// Configuración de la conexión a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "cath123",
  database: process.env.DB_NAME || "cinema_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Función para conectar a la base de datos
const connectDB = async () => {
  try {
    const connection = await pool.getConnection()
    console.log("Conexión a MySQL establecida correctamente")
    connection.release()

    // Verificar si las tablas existen
    await checkTables()

    return pool
  } catch (error) {
    console.error("Error al conectar a MySQL:", error)
    process.exit(1)
  }
}

// Función para verificar si las tablas existen
const checkTables = async () => {
  try {
    // Verificar si la tabla users existe
    const [usersTable] = await pool.query(
      `
      SELECT * 
      FROM information_schema.tables
      WHERE table_schema = ?
      AND table_name = 'users'
    `,
      [process.env.DB_NAME || "cinema_db"],
    )

    if (usersTable.length === 0) {
      console.log("Creando tablas...")
      await createTables()
    } else {
      console.log("Las tablas ya existen")
    }
  } catch (error) {
    console.error("Error al verificar tablas:", error)
    throw error
  }
}

// Función para crear las tablas necesarias
const createTables = async () => {
  try {
    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        role ENUM('admin', 'client') DEFAULT 'client',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabla de salas de cine
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cinema_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        movie_title VARCHAR(255) NOT NULL,
        movie_poster VARCHAR(255) NOT NULL,
        rows INT NOT NULL,
        columns INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabla de reservaciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        cinema_room_id INT NOT NULL,
        reservation_date DATE NOT NULL,
        seats TEXT NOT NULL,
        qr_code VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (cinema_room_id) REFERENCES cinema_rooms(id)
      )
    `)

    console.log("Tablas creadas correctamente")
  } catch (error) {
    console.error("Error al crear tablas:", error)
    throw error
  }
}

// Crear un usuario administrador por defecto si no existe
const createDefaultAdmin = async () => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", ["admin"])

    if (rows.length === 0) {
      const bcrypt = require("bcryptjs")
      const hashedPassword = await bcrypt.hash("admin123", 10)

      await pool.query("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)", [
        "admin",
        hashedPassword,
        "admin@cinema.com",
        "admin",
      ])

      console.log("Usuario administrador creado correctamente")
    }
  } catch (error) {
    console.error("Error al crear usuario administrador:", error)
  }
}

// Exportar funciones y pool
module.exports = {
  connectDB,
  pool,
  createDefaultAdmin,
}
