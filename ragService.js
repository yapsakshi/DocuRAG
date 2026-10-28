
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";

export async function processPDF(filePath) {
  const documentId = randomUUID();
  let parser;

  try {
    // 1. Read the uploaded PDF
    const dataBuffer = fs.readFileSync(filePath);

    parser = new PDFParse({
      data: dataBuffer,
    });

    // 2. Extract text
    const result = await parser.getText();
    const text = result.text;

    if (!text.trim()) {
      throw new Error("No readable text found in this PDF.");
    }

    console.log("PDF loaded:", path.basename(filePath));
    console.log("Pages:", result.total);

    // 3. Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(text);

    console.log("Number of chunks:", chunks.length);

    // 4. Create embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-embedding-001",
    });

    // 5. Connect to Pinecone
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(
      process.env.PINECONE_INDEX_NAME
    );

    // 6. Store chunks in batches of five
    for (let i = 0; i < chunks.length; i += 5) {
      const batch = chunks.slice(i, i + 5);

      const vectors = await embeddings.embedDocuments(batch);
      const records = [];

      for (let j = 0; j < vectors.length; j++) {
        if (vectors[j].length === 0) {
            console.log("Empty embedding at chunk:", i + j);
            console.log("Chunk text:", batch[j]);
          
            throw new Error(
              `Gemini returned an empty embedding for chunk ${i + j}.`
            );
          }
          
          if (vectors[j].length !== 3072) {
            throw new Error(
              `Invalid embedding dimensions at chunk ${i + j}: ${vectors[j].length}`
            );
          }

        records.push({
          id: `${documentId}-${i + j}`,
          values: vectors[j],
          metadata: {
            documentId,
            chunkIndex: i + j,
            text: batch[j],
          },
        });
      }

      await pineconeIndex.upsert(records);

      console.log(
        `Stored chunks ${i} to ${i + batch.length - 1}`
      );
    }

    // 7. Return the result
    console.log("PDF indexed successfully!");

    return {
      documentId,
      filename: path.basename(filePath),
      totalChunks: chunks.length,
    };

  } finally {
    // 8. Release PDF parser resources
    if (parser) {
      await parser.destroy();
    }
  }
}
