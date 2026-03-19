import express from "express";
import { generateAudioOverview } from "../controllers/audioController.js";

const router = express.Router();

router.post("/generate", generateAudioOverview);

export default router;
