import express, { Request, Response } from 'express';
import cors from 'cors';
import { chunkText } from './utils/chunking.js';
import { getEmbedding } from "./utils/embedding.js";
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";
import multer from "multer"
import { extractText } from './utils/extractText.js';
import session from "express-session"
import passport from './passport.js';
import mindmapRouter from './routes/mindmap.js';
import flashcardsRouter from './routes/flashcards.js';
import quizRouter from './routes/quiz.js';
import audioRouter from './routes/audio.js';


const upload = multer({ dest: "uploads/" })

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const app = express();
app.set("trust proxy", 1); // Trust Render's secure proxy

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://textbookkkllm.vercel.app',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(o => origin.startsWith(o) || o.startsWith(origin));
        if (isAllowed || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('railway.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json());

app.use("/api/mindmap", mindmapRouter);
app.use("/api/flashcards", flashcardsRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/audio", audioRouter);

app.use(
    session({
        secret: "secret",
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        }
    })
)

app.use(passport.initialize())
app.use(passport.session())

app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
)

app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
    }),
    (req, res) => {
        const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
        res.redirect(`${frontendUrl}/dashboard`)
    }
)

app.get("/api/user", (req, res) => {
    res.send(req.user)
})

app.post("/api/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to logout" });
        }
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            res.json({ message: "Logged out successfully" });
        });
    });
})

app.post("/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
        const uploadedContent = req.file;
        const chat_id = req.body.chat_id;

        if (!uploadedContent) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        if (!chat_id) {
            res.status(400).json({ error: "chat_id is required" });
            return;
        }

        console.log("Uploaded file:", uploadedContent);
        console.log("For chat ID:", chat_id);

        const text = await extractText(req.file);

        if (!text) {
            res.status(400).json({ error: "Could not extract text from file" });
            return;
        }

        const chunks = chunkText(text);

        for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);

            const { data, error } = await supabase
                .from("documents")
                .insert({
                    content: chunk,
                    embedding,
                    chat_id: chat_id
                });

            if (error) {
                console.error("Insert error:", error);
            }
        }

        // Track the file name in the chat messages
        await supabase.from("messages").insert({
            chat_id: chat_id,
            role: "system",
            content: `__FILE_UPLOAD__:${uploadedContent.originalname}`
        });

        res.json({
            msg: "Content uploaded and vectorized successfully"
        });
    } catch (e) {
        console.log("Upload error:", e);
        res.status(500).json({
            error: "Failed to upload content: " + String(e)
        });
    }
});

app.get("/messages/:chatId", async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }

        res.json({ messages: data });
    } catch (e) {
        console.error("Fetch messages error:", e);
        res.status(500).json({ error: String(e) });
    }
});

app.post("/ask", async (req: Request, res: Response) => {
    try {
        const { question, chat_id } = req.body;
        console.log("question", question);
        console.log("chat_id", chat_id);

        if (!question || !chat_id) {
            res.status(400).json({ error: "question and chat_id are required" });
            return;
        }

        // Save user question to messages
        await supabase.from("messages").insert({
            chat_id: chat_id,
            role: "user",
            content: question
        });

        let data = [];
        console.log("Generating embedding for question...")
        const embedding = await getEmbedding(question);

        // Fetch matched documents for this specific chat
        const { data: queryData, error } = await supabase.rpc("match_embeddings", {
            query_embedding: embedding,
            match_count: 40,
            match_threshold: 0.30,
            p_chat_id: chat_id
        });

        if (error) {
            console.error("RPC Error:", error);
            res.status(500).json({ error: error.message });
            return;
        }

        data = queryData || [];
        const context = data.map((item: any) => item.content).join("\n");

        console.log("Calling OpenAI with context length:", context.length);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Answer the question using ONLY the provided context. If the context does not contain the answer, say so."
                },
                {
                    role: "user",
                    content: `Context:\n${context}\n\nQuestion:\n${question}`
                }
            ]
        });

        const answer = completion.choices[0].message.content;

        // Save assistant answer to messages
        await supabase.from("messages").insert({
            chat_id: chat_id,
            role: "assistant",
            content: answer
        });

        res.json({ answer, contextUsed: data.length > 0 });

    } catch (e) {
        console.error("Catch error:", e)
        res.status(500).json({ error: String(e) })
    }
});

app.use((err: any, req: Request, res: Response, next: any) => {
    console.error("Global Express Error:", err);
    res.status(500).json({ error: String(err), stack: err.stack, message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
