const express = require("express")
const router = express.Router()
const userController = require("../controllers/user.controller")
const { verifyToken, isAdmin, isActive } = require("../middleware/auth.middleware")

// Rutas protegidas para administradores
router.get("/", verifyToken, isAdmin, userController.getAllUsers)
router.get("/:id", verifyToken, isActive, userController.getUserById)
router.put("/:id/deactivate", verifyToken, isAdmin, userController.deactivateUser)
router.put("/:id/activate", verifyToken, isAdmin, userController.activateUser)

module.exports = router
