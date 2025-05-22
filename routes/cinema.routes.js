const express = require("express")
const router = express.Router()
const cinemaController = require("../controllers/cinema.controller")
const { verifyToken, isAdmin, isActive } = require("../middleware/auth.middleware")

// Rutas públicas
router.get("/", cinemaController.getAllCinemaRooms)
router.get("/:id", cinemaController.getCinemaRoomById)

// Rutas protegidas para administradores
router.post("/", verifyToken, isAdmin, cinemaController.createCinemaRoom)
router.put("/:id/movie", verifyToken, isAdmin, cinemaController.updateCinemaRoomMovie)
router.put("/:id/capacity", verifyToken, isAdmin, cinemaController.updateCinemaRoomCapacity)

module.exports = router
