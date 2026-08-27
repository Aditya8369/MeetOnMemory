import express from "express";
import * as meetingAttendanceController from "../controllers/meetingAttendanceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true }); // Allows access to meetingId from parent route

router.use(protect); // Ensure user is authenticated

router.get("/", meetingAttendanceController.getMeetingAttendance);
router.post("/checkin", meetingAttendanceController.checkIn);
router.post("/checkout", meetingAttendanceController.checkOut);
router.put("/excuse", meetingAttendanceController.markExcused);
router.post("/finalize", meetingAttendanceController.finalizeAttendance);

export default router;
