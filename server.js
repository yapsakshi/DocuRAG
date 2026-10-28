import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatting } from "../query.js";
import { processPDF } from "./ragService.js";

dotenv.config({ path: "../.env" });

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
    dest: "uploads/",
  });

app.get("/", (req, res) => {
  res.json({ message: "DocuRAG API is running!" });
});


app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "Please select a PDF file.",
      });
    }
  
    try {
      const result = await processPDF(req.file.path);
  
      res.json({
        message: "PDF uploaded and indexed successfully!",
        ...result,
      });
    } catch (error) {
      console.error("PDF processing error:", error);
  
      res.status(500).json({
        error: error.message || "Could not process the PDF.",
      });
    }
  });
  

app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Please enter a question.",
      });
    }

    // Temporary test: we will connect the RAG code later.
    console.log("NEW SERVER: calling RAG");
    const answer = await chatting(question);

    res.json({ answer });
    // res.json({
    //   answer: `Your question was received: ${question}`,
    // });
  } catch (error) {
    console.error("Chat API error:", error);

    res.status(500).json({
      error: "Something went wrong.",
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`DocuRAG API running at http://localhost:${PORT}`);
});
