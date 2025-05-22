const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const path = require("path")
const multer = require("multer")
const { connectDB, createDefaultAdmin } = require("./db")
require("dotenv").config()

// Importar rutas
const authRoutes = require("./routes/auth.routes")
const userRoutes = require("./routes/user.routes")
const cinemaRoutes = require("./routes/cinema.routes")
const reservationRoutes = require("./routes/reservation.routes")

const app = express()
const PORT = process.env.PORT || 4000

// Configuración de multer para carga de archivos
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

// Middlewares
app.use(cors())
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/qrcodes", express.static(path.join(__dirname, "qrcodes")))

// Asegurarse de que los directorios existan
const fs = require("fs")
const uploadDir = path.join(__dirname, "uploads")
const qrDir = path.join(__dirname, "qrcodes")

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true })
}

// Middleware para manejar la carga de archivos
app.use((req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    if (req.path.includes("/cinemas")) {
      upload.single("moviePoster")(req, res, (err) => {
        if (err) {
          console.error("Error en la carga de archivos:", err)
          return res.status(400).json({ message: "Error en la carga de archivos" })
        }
        next()
      })
    } else {
      next()
    }
  } else {
    next()
  }
})

// Rutas
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/cinemas", cinemaRoutes)
app.use("/api/reservations", reservationRoutes)


// Añade esto a tu server.js
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "API de Cinema Project funcionando correctamente" })
})

// Iniciar servidor
const startServer = async () => {
  try {
    await connectDB()
    // Crear usuario administrador por defecto
    await createDefaultAdmin()

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`)
    })
  } catch (error) {
    console.error("Error al iniciar el servidor:", error)
  }
}

startServer()
