import express from "express";
import {
    generateRoot,
    expandNode,
    askNode
} from "../controllers/mindmapControllers.js";

const router = express.Router();

router.post("/root", generateRoot);
router.post("/expand", expandNode);
router.post("/ask", askNode);

export default router;