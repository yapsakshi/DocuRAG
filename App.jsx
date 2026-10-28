
import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];

    if (selectedFile && selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile || null);
    setUploaded(false);
  }

  
async function handleUpload() {
  if (!file || uploading) {
    if (!file) alert("Please select a PDF first.");
    return;
  }

  const formData = new FormData();
  formData.append("pdf", file);

  setUploading(true);

  try {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();
    console.log("Upload response status:", response.status);
    console.log("Upload response:", responseText);

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Backend returned HTML instead of JSON. Check the backend route."
      );
    }

    if (!response.ok) {
      throw new Error(data.error || "Upload failed.");
    }

    setUploaded(true);
    alert(data.message || "PDF uploaded successfully!");
  } catch (error) {
    console.error("Upload error:", error);
    alert(error.message);
  } finally {
    setUploading(false);
  }
}

  async function handleSubmit(event) {
    event.preventDefault();

    if (!question.trim() || loading) return;

    const userQuestion = question.trim();

    setMessages((previous) => [
      ...previous,
      { role: "user", text: userQuestion },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: data.answer },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: error.message || "Could not connect to the backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div>
            <h2>DocuRAG</h2>
            <p>Document intelligence</p>
          </div>
        </div>

        <button className="new-chat" onClick={() => setMessages([])}>
          + New conversation
        </button>

        <div className="sidebar-section">
          <p className="section-label">YOUR WORKSPACE</p>
          <div className="sidebar-item">📄 Documents</div>
          <div className="sidebar-item">💬 Conversations</div>
        </div>

        <div className="sidebar-footer">
          <div className="status-dot" />
          RAG workspace
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>Document chat</strong>
          </div>
          <span className="model-badge">Gemini · RAG</span>
        </header>

        <section className="content">
          <div className="welcome">
            <div className="welcome-icon">✦</div>
            <p className="eyebrow">YOUR AI RESEARCH ASSISTANT</p>
            <h1>Chat with your documents.</h1>
            <p className="subtitle">
              Upload a PDF, ask a question, and explore its content
              with AI-powered answers.
            </p>
          </div>

          <label className="upload-card">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              hidden
            />

            <div className="upload-icon">↑</div>
            <div className="upload-text">
              <strong>{file ? file.name : "Upload your PDF"}</strong>
              <p>
                {uploaded
                  ? "PDF uploaded successfully"
                  : file
                    ? "PDF selected and ready"
                    : "Choose a PDF file from your computer"}
              </p>
            </div>
            <span className="browse-button">
              {file ? "Change file" : "Browse files"}
            </span>
          </label>

          {file && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading
                ? "Uploading..."
                : uploaded
                  ? "Upload another time"
                  : "Upload PDF"}
            </button>
          )}

          <div className="suggestions">
            <p className="section-label">TRY ASKING</p>
            <div className="suggestion-grid">
              {[
                "Summarize this document",
                "Explain the key concepts",
                "What are the important topics?",
              ].map((item) => (
                <button
                  className="suggestion"
                  key={item}
                  onClick={() => setQuestion(item)}
                >
                  <span>✧</span> {item} <span className="arrow">↗</span>
                </button>
              ))}
            </div>
          </div>

          <div className="chat-area">
            {messages.map((message, index) => (
              <div className="message" key={index}>
                <div className="message-avatar">
                  {message.role === "user" ? "Y" : "AI"}
                </div>
                <div>
                  <strong>
                    {message.role === "user" ? "You" : "DocuRAG"}
                  </strong>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message">
                <div className="message-avatar">AI</div>
                <div>
                  <strong>DocuRAG</strong>
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>

          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask anything about your document..."
              aria-label="Ask a question"
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={loading || !question.trim()}
            >
              ↑
            </button>
          </form>

          <p className="disclaimer">
            AI-generated responses may contain errors. Verify important facts.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
