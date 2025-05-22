const express = require("express")
const router = express.Router()
const reservationController = require("../controllers/reservation.controller")
const { verifyToken, isActive } = require("../middleware/auth.middleware")

// Rutas protegidas
router.post("/", verifyToken, isActive, reservationController.createReservation)
router.get("/user", verifyToken, isActive, reservationController.getUserReservations)
router.get("/:id", verifyToken, isActive, reservationController.getReservationById)

module.exports = router
