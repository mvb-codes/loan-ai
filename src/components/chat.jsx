import { Bot, Mic, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { v4 as uuidv4 } from "uuid";
import SpeechToTextToSpeech from "./chatv2";

export default function Speech_to_txt() {
	const [showVoiceUI, setShowVoiceUI] = useState(false);
	const [messages, setMessages] = useState([]);
	const [inputText, setInputText] = useState("");
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
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			mediaRecorderRef.current = new MediaRecorder(stream);

			mediaRecorderRef.current.ondataavailable = (e) => {
				audioChunksRef.current.push(e.data);
			};

			mediaRecorderRef.current.onstop = () => {
				const blob = new Blob(audioChunksRef.current, {
					type: "audio/wav",
				});
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
		mediaRecorderRef.current?.stop();
		setIsRecording(false);
	};

	const [ChatID, setChatID] = useState(uuidv4());

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if ((!inputText.trim() && !audioBlob) || isTyping) return;

		if (!audioBlob) {
			setMessages((prev) => [
				...prev,
				{
					text: inputText,
					isBot: false,
					timestamp: new Date().toLocaleTimeString(),
				},
			]);
			setInputText("");
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

				const response = await fetch(
					"https://api.sarvam.ai/speech-to-text-translate",
					{
						method: "POST",
						headers: {
							"api-subscription-key": "7c801e4f-4cf6-4500-bf3d-e44d5e00af0e",
						},
						body: form,
					}
				);
				data = await response.json();
			} else {
				const response = await fetch("http://localhost:8000/loan_chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						chat_query: inputText,
						target_language: "en-IN",
						id: ChatID,
					}),
				});
				data = await response.json();
			}

			setMessages((prev) => [
				...prev,
				{
					text: data,
					isBot: true,
					language: data.language_code,
					timestamp: new Date().toLocaleTimeString(),
				},
			]);
		} catch (error) {
			console.error(error);
			setMessages((prev) => [
				...prev,
				{
					text: `Error: ${error.message}`,
					isBot: true,
					isError: true,
					timestamp: new Date().toLocaleTimeString(),
				},
			]);
		} finally {
			setIsTyping(false);
			setAudioBlob(null);
			setAudioUrl("");
		}
	};

	return (
		<div className="h-[93vh] bg-[#0a0a0a] flex items-center justify-center p-4 ml-[5rem]">
			<div className="w-full max-w-6xl bg-[#1a1a1a] rounded-xl shadow-lg flex flex-col h-[90vh]">
				{/* Header */}
				<div className="p-4 bg-[#1a1a1a] rounded-t-xl border-b border-[#2a2a2a]">
					<div className="flex items-center space-x-2">
						<div className="h-8 w-8 rounded-full bg-[#4285f4] flex items-center justify-center text-white">
							AI
						</div>
						<h1 className="font-semibold text-[#ffffff]">Multimodal Chat</h1>
					</div>
				</div>

				{/* Chat Messages */}
				<div className="flex-1 p-4 overflow-auto">
					{messages.map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.isBot ? "" : "justify-end"} mb-4`}
						>
							<div
								className={`max-w-[85%] ${
									msg.isBot ? "" : "w-full flex justify-end"
								}`}
							>
								{!msg.isBot ? (
									<div className="bg-[#2a2a2a] p-3 rounded-lg text-[#ffffff] shadow-sm max-w-[80%]">
										<div className="flex items-center space-x-2">
											<User className="h-4 w-4 text-[#4285f4]" />
											<p>{msg.text}</p>
										</div>
										<div className="text-xs text-gray-400 mt-1 flex items-center justify-end">
											<span>{msg.timestamp}</span>
										</div>
									</div>
								) : (
									<div className="mt-4 bg-[#1f1f1f] p-4 rounded-lg text-[#ffffff] shadow-sm">
										<div className="flex items-center text-sm text-gray-400 mb-2">
											<Bot className="h-4 w-4 text-[#4285f4]" />
											<span className="font-medium ml-2">Response</span>
											<span className="mx-2">•</span>
											<span>{msg.timestamp}</span>
											{msg.language && (
												<span className="ml-2 px-2 py-1 bg-[#2a2a2a] rounded text-xs">
													{msg.language}
												</span>
											)}
										</div>
										<div className="mb-4">
											<ReactMarkdown remarkPlugins={[remarkGfm]}>
												{msg.text}
											</ReactMarkdown>
										</div>
										{msg.audioData && (
											<button
												onClick={() => playAudio(msg.audioData)}
												className="mt-2 flex items-center text-blue-400 hover:text-blue-300"
											>
												<Volume2 className="h-4 w-4 mr-2" />
												Play Response
											</button>
										)}
									</div>
								)}
							</div>
						</div>
					))}
					{isTyping && (
						<div className="flex items-center space-x-2 text-gray-400">
							<div className="animate-pulse">Processing...</div>
							<div className="flex space-x-1">
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Area */}
				<div className="border-t border-[#2a2a2a] p-4 bg-[#1a1a1a] rounded-b-xl">
					<form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={inputText}
								onChange={(e) => setInputText(e.target.value)}
								placeholder="Type your message or use voice input"
								disabled={isTyping}
								className="flex-1 p-3 bg-[#2a2a2a] text-[#ffffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285f4]"
							/>
							<button
								type="button"
								onClick={() => setShowVoiceUI(true)}
								className="p-3 bg-[#4285f4] hover:bg-[#357abd] text-white rounded-lg"
							>
								<Mic className="h-5 w-5" />
							</button>
							<button
								type="submit"
								disabled={isTyping || !inputText}
								className="p-3 bg-[#4285f4] text-white rounded-lg hover:bg-[#357abd] transition-colors disabled:opacity-50"
							>
								<Send className="h-5 w-5" />
							</button>
						</div>
					</form>
				</div>
			</div>

			{showVoiceUI && (
				<SpeechToTextToSpeech
					onClose={() => setShowVoiceUI(false)}
					onTranscript={(transcript) => {
						setMessages((prev) => [
							...prev,
							{
								text: transcript,
								isBot: false,
								timestamp: new Date().toLocaleTimeString(),
							},
						]);
					}}
				/>
			)}
		</div>
	);
}
