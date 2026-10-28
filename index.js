//PHASE ONE****************

import fs from "fs";
import "dotenv/config";

import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";

const PDF_PATH = "./Dsa.pdf";

async function indexDocument() {

    // 1. Load PDF
    const dataBuffer = fs.readFileSync(PDF_PATH);

    const parser = new PDFParse({
        data: dataBuffer
    });

    // 2. Extract text
    const result = await parser.getText();

    console.log("PDF loaded successfully!");
    console.log("Number of pages:", result.total);
    console.log("Number of characters:", result.text.length);

    const text = result.text;

    // 3. Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    });

    const chunks = await textSplitter.splitText(text);

    console.log("Number of chunks:", chunks.length);

    // 4. Convert chunks into LangChain Documents
    const documents = chunks.map((chunk, index) => {
        return new Document({
            pageContent: chunk,
            metadata: {
                source: PDF_PATH,
                chunkIndex: index
            }
        });
    });

    console.log("Number of documents:", documents.length);

    // 5. Create embedding model
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,/////////////////////////////////////////////////
        model: "gemini-embedding-001",
        
    });

    const testVector = await embeddings.embedQuery("Hello world");

    console.log("Embedding dimensions:", testVector.length);
    console.log("First few values:", testVector.slice(0, 5));
    
    const testDocumentVectors = await embeddings.embedDocuments([
        "Hello world",
        "This is a test document",
    ]);
    
    console.log(
        "Number of document embeddings:",
        testDocumentVectors.length
    );
    
    console.log(
        "Document embedding dimensions:",
        testDocumentVectors[0].length
    );
    
    console.log(
        "First few values:",
        testDocumentVectors[0].slice(0, 5)
    );

    // 6. Initialize Pinecone client
    const pinecone = new Pinecone();

    const pineconeIndex = pinecone.Index(
        process.env.PINECONE_INDEX_NAME
    );

    // 7. Store documents + embeddings in Pinecone
    // await PineconeStore.fromDocuments(documents,embeddings,
    //     {
    //         pineconeIndex,
    //         maxConcurrency: 5
    //     }
    // );


//     const vectors = await embeddings.embedDocuments([
//         documents[0].pageContent,
//     ]);
    
//     console.log("Vector length before Pinecone:", vectors[0].length);
    
//     await pineconeIndex.upsert([
//         {
//             id: "test-vector-1",
//             values: vectors[0],
//             metadata: {
//                 source: PDF_PATH,
//                 chunkIndex: 0,
//             },
//         },
//     ]);
    
//      console.log("Successfully inserted test vector!");


    
    
    

//    // console.log("Successfully stored data/documents in Pinecone!");

//     //8. Destroy PDF parser
//     await parser.destroy();
// }

// await indexDocument();




    // 7. Store all document chunks in Pinecone

    for (let i = 0; i < documents.length; i += 5) {
        const batch = documents.slice(i, i + 5);

        const vectors = await embeddings.embedDocuments(
            batch.map(doc => doc.pageContent)
        );

        // Check that every vector has 3072 dimensions
        for (let j = 0; j < vectors.length; j++) {
            if (vectors[j].length !== 3072) {
                console.log("Problem at chunk:", i + j);
                console.log("Vector dimensions:", vectors[j].length);
                console.log("Chunk text:", batch[j].pageContent.slice(0, 200));

                await parser.destroy();
                return;
            }
        }

        // Store this batch in Pinecone
        const records = batch.map((doc, j) => ({
            id: `chunk-${i + j}`,
            values: vectors[j],
            metadata: {
                source: PDF_PATH,
                chunkIndex: i + j,
                text: doc.pageContent
            }
        }));

        await pineconeIndex.upsert(records);

        console.log("Stored chunks:", i, "to", i + batch.length - 1);
    }

    console.log("Successfully stored all document chunks!");

     //8. Destroy PDF parser
    await parser.destroy();
}

await indexDocument();
