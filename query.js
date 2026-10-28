// //PHASE 2 USER SE SAWAL PUCHHNA
// import { GoogleGenAI } from "@google/genai";
// import "dotenv/config";
// import readlineSync from 'readline-sync';
// import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
// import { Pinecone } from "@pinecone-database/pinecone";

// const ai = new GoogleGenAI({});
// const History = []

// async function transformQuery(question){

//     History.push({
//         role:'user',
//         parts:[{text:question}]
//         })  
    
//     const response = await ai.models.generateContent({
//         model: "gemini-3.6-flash",
//         contents: History,
//         config: {
//           systemInstruction: `
//           Rewrite the user's latest question into a complete, standalone question
//           that can be understood without the conversation history.
          
//           Use the previous conversation to resolve references such as:
//           - it
//           - this
//           - that
//           - they
//           - explain it
//           - tell me more
//           - its advantages
          
//           If the question is already standalone, return it unchanged.
          
//           Return ONLY the rewritten question.`,
//         },
//      });
     
//      History.pop()
     
//      return response.text
    
    
//     }

// async function chatting(question){
//    // convert the user question into vector
//    const queries=await transformQuery(question);


//    const embeddings = new GoogleGenerativeAIEmbeddings({
//     apiKey: process.env.GEMINI_API_KEY,//////////////////////////////////////////////////
//     model: 'gemini-embedding-001',
//     });
 
 
//     const queryVector = await embeddings.embedQuery(queries); 
//     //query vector

//     //make connection with pine
//      const pinecone = new Pinecone();
//      const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

//      const searchResults = await pineconeIndex.query({
//         topK: 10,
//         vector: queryVector,
//         includeMetadata: true,
//         });
//         //console.log(searchResults);

//         //top 10 documents se 10 metadata ke text part ko uthana h
//         //create the context for the llm
//         const context = searchResults.matches.map(match => match.metadata.text).join("\n\n---\n\n");

//         History.push({role:'user', parts:[{text:question}]}) 

//         const response = await ai.models.generateContent({
//             model: "gemini-3.6-flash",
//             contents: History,
//             config: {
//               systemInstruction: `You have to behave like a Data Structure and Algorithm Expert.
//             You will be given a context of relevant information and a user question.
//             Your task is to answer the user's question based ONLY on the provided context.
//             If the answer is not in the context, you must say "I could not find the answer in the provided document."
//             Keep your answers clear, concise, and educational.
              
//               Context: ${context}
//               `,
//             },
//            });
        
        
//            History.push({
//             role:'model',
//             parts:[{text:response.text}]
//           })
        
//           console.log("\n");
//           console.log(response.text);     
  
// }

// async function main(){
//    const userProblem = readlineSync.question("Ask me anything--> ");
//    await chatting(userProblem);
//    main();
// }


// main();


import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";

dotenv.config({ path: new URL("./.env", import.meta.url) });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function transformQuery(question, history) {
  const contents = [
    ...history,
    {
      role: "user",
      parts: [{ text: question }],
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents,
    config: {
      systemInstruction: `
        Rewrite the user's latest question into a complete,
        standalone question that can be understood without
        the conversation history.

        If the question is already standalone, return it unchanged.
        Return ONLY the rewritten question.
      `,
    },
  });

  return response.text;
}

export async function chatting(question, history = []) {
  // 1. Rewrite the question using conversation history
  const queries = await transformQuery(question, history);

  // 2. Convert the question into an embedding
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
  });

  const queryVector = await embeddings.embedQuery(queries);

  // 3. Search Pinecone for relevant document chunks
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(
    process.env.PINECONE_INDEX_NAME
  );

  const searchResults = await pineconeIndex.query({
    topK: 10,
    vector: queryVector,
    includeMetadata: true,
  });

  // 4. Create context from the retrieved chunks
  const context = searchResults.matches
    .map((match) => match.metadata?.text)
    .filter(Boolean)
    .join("\n\n---\n\n");

  // 5. Generate the answer using Gemini
  const contents = [
    ...history,
    {
      role: "user",
      parts: [{ text: question }],
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents,
    config: {
      systemInstruction: `
        You are a Data Structures and Algorithms expert.

        Answer the user's question using ONLY the provided context.
        If the answer is not in the context, say:
        "I could not find the answer in the provided document."

        Keep your answers clear, concise, and educational.

        Context:
        ${context}
      `,
    },
  });

  // 6. Return the answer to the backend
  return response.text;
}
