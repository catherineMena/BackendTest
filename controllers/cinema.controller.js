const { pool } = require("../db")
const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require("uuid")

// Función para obtener todas las salas de cine
const getAllCinemaRooms = async (req, res) => {
  try {
    // Obtener todas las salas de cine
    const [rooms] = await pool.query("SELECT * FROM cinema_rooms")

    // Obtener todas las reservaciones
    const [reservations] = await pool.query("SELECT * FROM reservations")

    // Procesar los resultados
    const processedRooms = await Promise.all(
      rooms.map(async (room) => {
        // Calcular el total de asientos
        const totalSeats = room.rows * room.columns

        // Obtener las reservaciones para esta sala
        const roomReservations = reservations.filter((r) => r.cinema_room_id === room.id)

        // Crear un mapa de disponibilidad por fecha
        const availability = {}
        const reservedSeatsMap = {}

        // Inicializar con fechas para los próximos 8 días
        const today = new Date()
        for (let i = 0; i < 8; i++) {
          const date = new Date(today)
          date.setDate(today.getDate() + i)
          const dateStr = date.toISOString().split("T")[0]
          availability[dateStr] = totalSeats
          reservedSeatsMap[dateStr] = []
        }

        // Actualizar la disponibilidad basada en las reservaciones
        roomReservations.forEach((reservation) => {
          const reservationDate = new Date(reservation.reservation_date)
          const dateStr = reservationDate.toISOString().split("T")[0]

          // Asegurarse de que la fecha existe en el mapa
          if (!availability[dateStr]) {
            availability[dateStr] = totalSeats
            reservedSeatsMap[dateStr] = []
          }

          // Parsear los asientos reservados con manejo seguro
          let seats = []
          try {
            if (typeof reservation.seats === "string") {
              // Intenta parsear si es una cadena
              seats = JSON.parse(reservation.seats)
            } else if (reservation.seats && typeof reservation.seats === "object") {
              // Si ya es un objeto (puede ser un buffer o un objeto JSON)
              if (Buffer.isBuffer(reservation.seats)) {
                // Si es un buffer, conviértelo a string primero
                seats = JSON.parse(reservation.seats.toString())
              } else {
                // Si ya es un objeto JSON
                seats = Array.isArray(reservation.seats) ? reservation.seats : []
              }
            }
          } catch (error) {
            console.error(`Error al parsear asientos para reservación ${reservation.id}:`, error)
            seats = [] // En caso de error, usar un array vacío
          }

          // Actualizar la disponibilidad
          availability[dateStr] -= seats.length

          // Añadir los asientos reservados al mapa
          reservedSeatsMap[dateStr] = [...reservedSeatsMap[dateStr], ...seats]
        })

        return {
          id: room.id,
          name: room.name,
          movie_title: room.movie_title,
          movie_poster: room.movie_poster,
          rows: room.rows,
          columns: room.columns,
          totalSeats,
          availability,
          reservedSeatsMap,
        }
      }),
    )

    res.status(200).json(processedRooms)
  } catch (error) {
    console.error("Error al obtener salas de cine:", error)
    res.status(500).json({ message: "Error al obtener salas de cine" })
  }
}

// Función para obtener una sala de cine por ID
const getCinemaRoomById = async (req, res) => {
  try {
    const { id } = req.params

    // Obtener la sala de cine
    const [rooms] = await pool.query("SELECT * FROM cinema_rooms WHERE id = ?", [id])

    if (rooms.length === 0) {
      return res.status(404).json({ message: "Sala de cine no encontrada" })
    }

    const room = rooms[0]

    // Calcular el total de asientos
    const totalSeats = room.rows * room.columns

    // Obtener las reservaciones para esta sala
    const [reservations] = await pool.query("SELECT * FROM reservations WHERE cinema_room_id = ?", [id])

    // Crear un mapa de disponibilidad por fecha
    const availability = {}
    const reservedSeatsMap = {}

    // Inicializar con fechas para los próximos 8 días
    const today = new Date()
    for (let i = 0; i < 8; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split("T")[0]
      availability[dateStr] = totalSeats
      reservedSeatsMap[dateStr] = []
    }

    // Actualizar la disponibilidad basada en las reservaciones
    reservations.forEach((reservation) => {
      const reservationDate = new Date(reservation.reservation_date)
      const dateStr = reservationDate.toISOString().split("T")[0]

      // Asegurarse de que la fecha existe en el mapa
      if (!availability[dateStr]) {
        availability[dateStr] = totalSeats
        reservedSeatsMap[dateStr] = []
      }

      // Parsear los asientos reservados con manejo seguro
      let seats = []
      try {
        if (typeof reservation.seats === "string") {
          // Intenta parsear si es una cadena
          seats = JSON.parse(reservation.seats)
        } else if (reservation.seats && typeof reservation.seats === "object") {
          // Si ya es un objeto (puede ser un buffer o un objeto JSON)
          if (Buffer.isBuffer(reservation.seats)) {
            // Si es un buffer, conviértelo a string primero
            seats = JSON.parse(reservation.seats.toString())
          } else {
            // Si ya es un objeto JSON
            seats = Array.isArray(reservation.seats) ? reservation.seats : []
          }
        }
      } catch (error) {
        console.error(`Error al parsear asientos para reservación ${reservation.id}:`, error)
        seats = [] // En caso de error, usar un array vacío
      }

      // Actualizar la disponibilidad
      availability[dateStr] -= seats.length

      // Añadir los asientos reservados al mapa
      reservedSeatsMap[dateStr] = [...reservedSeatsMap[dateStr], ...seats]
    })

    res.status(200).json({
      id: room.id,
      name: room.name,
      movie_title: room.movie_title,
      movie_poster: room.movie_poster,
      rows: room.rows,
      columns: room.columns,
      totalSeats,
      availability,
      reservedSeatsMap,
    })
  } catch (error) {
    console.error("Error al obtener sala de cine:", error)
    res.status(500).json({ message: "Error al obtener sala de cine" })
  }
}

// Función para crear una nueva sala de cine
const createCinemaRoom = async (req, res) => {
  try {
    const { name, movieTitle, rows, columns } = req.body
    let moviePoster = ""

    // Manejar la carga de la imagen del póster
    if (req.file) {
      const uploadDir = path.join(__dirname, "../uploads")

      // Crear directorio si no existe
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const fileExtension = path.extname(req.file.originalname)
      const fileName = `${uuidv4()}${fileExtension}`
      const filePath = path.join(uploadDir, fileName)

      fs.writeFileSync(filePath, req.file.buffer)
      moviePoster = `/uploads/${fileName}`
    } else if (req.body.moviePoster) {
      moviePoster = req.body.moviePoster
    } else {
      // Usar un póster por defecto si no se proporciona
      moviePoster = "/uploads/default-poster.jpg"
    }

    // Insertar la nueva sala en la base de datos
    const [result] = await pool.query(
      "INSERT INTO cinema_rooms (name, movie_title, movie_poster, `rows`, `columns`) VALUES (?, ?, ?, ?, ?)",
      [name, movieTitle, moviePoster, Number.parseInt(rows), Number.parseInt(columns)],
    )

    res.status(201).json({
      id: result.insertId,
      name,
      movie_title: movieTitle,
      movie_poster: moviePoster,
      rows: Number.parseInt(rows),
      columns: Number.parseInt(columns),
    })
  } catch (error) {
    console.error("Error al crear sala de cine:", error)
    res.status(500).json({ message: "Error al crear sala de cine" })
  }
}

// Función para actualizar la información de la película de una sala
const updateCinemaRoomMovie = async (req, res) => {
  try {
    const { id } = req.params
    const { name, movieTitle } = req.body
    let moviePoster = ""

    // Obtener la información actual de la sala
    const [rooms] = await pool.query("SELECT * FROM cinema_rooms WHERE id = ?", [id])

    if (rooms.length === 0) {
      return res.status(404).json({ message: "Sala de cine no encontrada" })
    }

    // Manejar la carga de la imagen del póster
    if (req.file) {
      const uploadDir = path.join(__dirname, "../uploads")

      // Crear directorio si no existe
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const fileExtension = path.extname(req.file.originalname)
      const fileName = `${uuidv4()}${fileExtension}`
      const filePath = path.join(uploadDir, fileName)

      fs.writeFileSync(filePath, req.file.buffer)
      moviePoster = `/uploads/${fileName}`
    } else if (req.body.moviePoster) {
      moviePoster = req.body.moviePoster
    } else {
      // Mantener el póster actual si no se proporciona uno nuevo
      moviePoster = rooms[0].movie_poster
    }

    // Actualizar la información de la película
    await pool.query("UPDATE cinema_rooms SET name = ?, movie_title = ?, movie_poster = ? WHERE id = ?", [
      name,
      movieTitle,
      moviePoster,
      id,
    ])

    res.status(200).json({
      id: Number.parseInt(id),
      name,
      movie_title: movieTitle,
      movie_poster: moviePoster,
    })
  } catch (error) {
    console.error("Error al actualizar información de película:", error)
    res.status(500).json({ message: "Error al actualizar información de película" })
  }
}

// Función para actualizar la capacidad de una sala
const updateCinemaRoomCapacity = async (req, res) => {
  try {
    const { id } = req.params
    const { rows, columns } = req.body

    // Verificar si la sala existe
    const [rooms] = await pool.query("SELECT * FROM cinema_rooms WHERE id = ?", [id])

    if (rooms.length === 0) {
      return res.status(404).json({ message: "Sala de cine no encontrada" })
    }

    // Verificar si hay reservaciones para esta sala
    const [reservations] = await pool.query("SELECT * FROM reservations WHERE cinema_room_id = ?", [id])

    if (reservations.length > 0) {
      return res.status(400).json({ message: "No se puede modificar la capacidad porque hay reservaciones activas" })
    }

    // Actualizar la capacidad
    await pool.query("UPDATE cinema_rooms SET `rows` = ?, `columns` = ? WHERE id = ?", [
      Number.parseInt(rows),
      Number.parseInt(columns),
      id,
    ])

    res.status(200).json({
      id: Number.parseInt(id),
      rows: Number.parseInt(rows),
      columns: Number.parseInt(columns),
    })
  } catch (error) {
    console.error("Error al actualizar capacidad de sala:", error)
    res.status(500).json({ message: "Error al actualizar capacidad de sala" })
  }
}

module.exports = {
  createCinemaRoom,
  updateCinemaRoomMovie,
  updateCinemaRoomCapacity,
  getAllCinemaRooms,
  getCinemaRoomById,
}
