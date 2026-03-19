import express from "express";
import { generateFlashcards } from "../controllers/flashcardcontrollers.js";

const router = express.Router();

router.post("/generate-flashcards", generateFlashcards);

export default router;
