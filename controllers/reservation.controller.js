const { pool } = require("../db")
const QRCode = require("qrcode")
const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")

// Crear una nueva reservación
const createReservation = async (req, res) => {
  console.log("📥 Body recibido en backend:", req.body)

  try {
    const { cinemaRoomId, reservationDate, seats } = req.body
    const userId = req.user.id

console.log("🎯 Tipos recibidos:", {
  cinemaRoomId,
  reservationDate,
  seats,
  seatsType: typeof seats,
  seatsLength: seats?.length
})



    // Validar datos
    if (!cinemaRoomId || !reservationDate || !seats || !seats.length) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" })
    }

    // Verificar que la sala existe
    const [cinemaRooms] = await pool.query("SELECT * FROM cinema_rooms WHERE id = ?", [cinemaRoomId])

    if (cinemaRooms.length === 0) {
      return res.status(404).json({ message: "Sala de cine no encontrada" })
    }

    const cinemaRoom = cinemaRooms[0]

    // Verificar que la fecha es válida (próximos 8 días)
    const currentDate = new Date()
    const selectedDate = new Date(reservationDate)
    const maxDate = new Date()
    maxDate.setDate(currentDate.getDate() + 8)

    if (selectedDate < currentDate || selectedDate > maxDate) {
      return res.status(400).json({ message: "La fecha de reservación debe estar dentro de los próximos 8 días" })
    }

    // Verificar que los asientos son válidos
    for (const seat of seats) {
      const [row, col] = seat.split("-").map(Number)

      if (row < 0 || row >= cinemaRoom.rows || col < 0 || col >= cinemaRoom.columns) {
        return res.status(400).json({ message: `Asiento ${seat} no es válido para esta sala` })
      }
    }

    // Verificar que los asientos no estén ya reservados
    const [existingReservations] = await pool.query(
      "SELECT seats FROM reservations WHERE cinema_room_id = ? AND reservation_date = ?",
      [cinemaRoomId, reservationDate],
    )

    const reservedSeats = []
    existingReservations.forEach((reservation) => {
      try {
        const reservationSeats = JSON.parse(reservation.seats)
        reservedSeats.push(...reservationSeats)
      } catch (error) {
        console.error("Error al parsear asientos:", error)
      }
    })

    const conflictingSeats = seats.filter((seat) => reservedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return res.status(400).json({
        message: `Los siguientes asientos ya están reservados: ${conflictingSeats.join(", ")}`,
      })
    }

    // Crear directorio para códigos QR si no existe
    const qrDir = path.join(__dirname, "../qrcodes")
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true })
    }

    // Generar datos para el código QR
    const qrData = JSON.stringify({
      userId,
      cinemaRoomId,
      cinemaRoomName: cinemaRoom.name,
      movieTitle: cinemaRoom.movie_title,
      reservationDate,
      seats,
    })

    // Generar nombre único para el archivo QR
    const qrFilename = `${uuidv4()}.png`
    const qrPath = path.join(qrDir, qrFilename)
    const qrRelativePath = `/qrcodes/${qrFilename}`

    // Generar código QR
    await QRCode.toFile(qrPath, qrData)

    // Guardar reservación en la base de datos
    const [result] = await pool.query(
      "INSERT INTO reservations (user_id, cinema_room_id, reservation_date, seats, qr_code) VALUES (?, ?, ?, ?, ?)",
      [userId, cinemaRoomId, reservationDate, JSON.stringify(seats), qrRelativePath],
    )

    res.status(201).json({
      message: "Reservación creada correctamente",
      reservation: {
        id: result.insertId,
        userId,
        cinemaRoomId,
        cinemaRoomName: cinemaRoom.name,
        movieTitle: cinemaRoom.movie_title,
        reservationDate,
        seats,
        qrCode: qrRelativePath,
      },
    })
  } catch (error) {
    console.error("Error al crear reservación:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener reservaciones del usuario actual
const getUserReservations = async (req, res) => {
  try {
    const userId = req.user.id

    const [reservations] = await pool.query(
      `
      SELECT r.*, c.name as cinema_room_name, c.movie_title
      FROM reservations r
      JOIN cinema_rooms c ON r.cinema_room_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.reservation_date DESC
    `,
      [userId],
    )

    // Formatear datos de reservaciones
    const formattedReservations = reservations.map((reservation) => {
      let seats = []
      try {
        seats = JSON.parse(reservation.seats)
      } catch (error) {
        console.error(`Error al parsear asientos para reservación ${reservation.id}:`, error)
      }

      return {
        id: reservation.id,
        cinemaRoomId: reservation.cinema_room_id,
        cinemaRoomName: reservation.cinema_room_name,
        movieTitle: reservation.movie_title,
        reservationDate: reservation.reservation_date,
        seats: seats,
        qrCode: reservation.qr_code,
        createdAt: reservation.created_at,
      }
    })

    res.status(200).json(formattedReservations)
  } catch (error) {
    console.error("Error al obtener reservaciones del usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener una reservación por ID
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Obtener reservación
    const [reservations] = await pool.query(
      `
      SELECT r.*, c.name as cinema_room_name, c.movie_title
      FROM reservations r
      JOIN cinema_rooms c ON r.cinema_room_id = c.id
      WHERE r.id = ?
    `,
      [id],
    )

    if (reservations.length === 0) {
      return res.status(404).json({ message: "Reservación no encontrada" })
    }

    const reservation = reservations[0]

    // Verificar que la reservación pertenece al usuario o es admin
    if (reservation.user_id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permiso para ver esta reservación" })
    }

    // Formatear datos de reservación
    let seats = []
    try {
      seats = JSON.parse(reservation.seats)
    } catch (error) {
      console.error(`Error al parsear asientos para reservación ${reservation.id}:`, error)
    }

    const formattedReservation = {
      id: reservation.id,
      userId: reservation.user_id,
      cinemaRoomId: reservation.cinema_room_id,
      cinemaRoomName: reservation.cinema_room_name,
      movieTitle: reservation.movie_title,
      reservationDate: reservation.reservation_date,
      seats: seats,
      qrCode: reservation.qr_code,
      createdAt: reservation.created_at,
    }

    res.status(200).json(formattedReservation)
  } catch (error) {
    console.error("Error al obtener reservación:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

module.exports = {
  createReservation,
  getUserReservations,
  getReservationById,
}
