import React, { useState, useRef, useEffect } from "react";
import { useCodeBlockToHtml, loadHighlighter } from "@llm-ui/code";
import { getHighlighterCore } from "shiki/core";
import getWasm from "shiki/wasm";
import parseHtml from "html-react-parser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Load the highlighter
const highlighter = loadHighlighter(
  getHighlighterCore({
    themes: ["github-dark"],
    langs: [], // Add specific languages if needed
    loadWasm: getWasm,
  })
);

// CodeBlock component
const CodeBlock = ({ code, language }) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    highlighter.then((hl) => {
      const highlighted = hl.codeToHtml(code, { lang: language });
      setHtml(highlighted);
    });
  }, [code, language]);

  return <div>{parseHtml(html)}</div>;
};

// MarkdownRenderer component
const MarkdownRenderer = ({ content }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
);

// Custom Chat Interface
const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !audioBlob) || isTyping) return;

    // Handle text input
    if (!audioBlob) {
      const newMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, newMessage]);
      setInput("");
    }

    setIsTyping(true);

    try {
      let data;
      if (audioBlob) {
          const form = new FormData();
          form.append("with_diarization", "false");
          form.append("file", audioBlob, "recording.wav");
          form.append("model", "saaras:flash");
          form.append("num_speakers", "1");

          const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
              method: "POST",
              headers: {
                  "api-subscription-key": "7c801e4f-4cf6-4500-bf3d-e44d5e00af0e",
              },
              body: form,
          });
          data = await response.json();
      } else {
          const response = await fetch("https://api.sarvam.ai/translate", {
              method: "POST",
              headers: {
                  "api-subscription-key": "7c801e4f-4cf6-4500-bf3d-e44d5e00af0e",
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  input: inputText,
                  source_language_code: "en-IN",
                  target_language_code: "kn-IN",
                  model: "mayura:v1",
              }),
          });
          data = await response.json();
      }

      setMessages(prev => [...prev, {
          text: data.transcript || data.translated_text,
          isBot: true,
          language: data.language_code,
          timestamp: new Date().toLocaleTimeString(),
      }]);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
            text: `Error: ${error.message}`,
            isBot: true,
            isError: true,
            timestamp: new Date().toLocaleTimeString(),
        }]);
    } finally {
        setIsTyping(false);
        setAudioBlob(null);
        setAudioUrl("");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#0a0a0a]">
      <div className="w-full max-w-[60%] p-4 bg-[#1a1a1a] shadow-lg rounded-lg">
        {/* Chat Messages */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto mb-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } my-2`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[#2a2a2a] text-[#ffffff]"
                    : "bg-[#1f1f1f] text-[#ffffff]"
                }`}
              >
                {msg.role === "user" ? (
                  <p>{msg.content}</p>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start my-2">
              <div className="max-w-[70%] p-3 rounded-lg bg-[#1f1f1f] text-[#ffffff]">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Processing...</div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 p-3 bg-[#2a2a2a] text-[#ffffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285f4]"
            placeholder="Type a message..."
            disabled={isTyping || isRecording}
          />
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-lg ${
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#4285f4] hover:bg-[#357abd]"
            } text-white`}
            disabled={isTyping}
          >
            {isRecording ? "⏹ Stop" : "🎤 Record"}
          </button>
          <button
            onClick={handleSend}
            className="bg-[#4285f4] text-white p-3 rounded-lg hover:bg-[#357abd] transition-colors"
            disabled={isTyping || (!input && !audioBlob)}
          >
            Send
          </button>
        </div>
        {audioUrl && (
          <div className="mt-2">
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;