import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function SpeechToTextToSpeech() {
	const [ChatId, setChatId] = useState(uuidv4());
	const [isRecording, setIsRecording] = useState(false);
	const [detectedLanguage, setDetectedLanguage] = useState("");
	const [transcript, setTranscript] = useState("");
	const [audioData, setAudioData] = useState(null);
	const [error, setError] = useState(null);
	const mediaRecorder = useRef(null);
	const audioChunks = useRef([]);
	const recognition = useRef(null);

	// Initialize speech recognition
	useEffect(() => {
		if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
			const SpeechRecognition =
				window.SpeechRecognition || window.webkitSpeechRecognition;
			recognition.current = new SpeechRecognition();
			recognition.current.continuous = false;
			recognition.current.interimResults = false;
		} else {
			setError("Speech recognition not supported in this browser");
		}
	}, []);

	// Handle audio recording
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder.current = new MediaRecorder(stream);

			mediaRecorder.current.ondataavailable = (e) => {
				audioChunks.current.push(e.data);
			};

			mediaRecorder.current.onstop = async () => {
				const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
				await processAudio(audioBlob);
				audioChunks.current = [];
			};

			mediaRecorder.current.start();
			setIsRecording(true);
			setError(null);
		} catch (err) {
			setError("Microphone access denied");
		}
	};

	const stopRecording = () => {
		if (mediaRecorder.current) {
			mediaRecorder.current.stop();
			setIsRecording(false);
		}
	};

	// Process audio through Sarvam AI APIs
	const processAudio = async (audioBlob) => {
		try {
			// Convert speech to text
			const sttFormData = new FormData();
			sttFormData.append("file", audioBlob, "recording.wav");
			sttFormData.append("model", "saarika:v2");
			sttFormData.append("language_code", "unknown");
			sttFormData.append("with_timestamps", "false");
			sttFormData.append("with_diarization", "false");

			const sttResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
				method: "POST",
				headers: {
					"api-subscription-key": "7c801e4f-4cf6-4500-bf3d-e44d5e00af0e",
				},
				body: sttFormData,
			});

			if (!sttResponse.ok) throw new Error("Speech recognition failed");

			const sttData = await sttResponse.json();
			setTranscript(sttData.transcript);
			const detectedLang = sttData.language_code || "en-IN";
			setDetectedLanguage(detectedLang);

			const agentResponse = await fetch("http://localhost:8000/loan_chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					chat_query: transcript,
					target_language: detectedLang,
					id: ChatId,
				}),
			});
			const data = await agentResponse.json();

			// Convert text to speech in detected language
			const ttsResponse = await fetch("https://api.sarvam.ai/text-to-speech", {
				method: "POST",
				headers: {
					"api-subscription-key": "7c801e4f-4cf6-4500-bf3d-e44d5e00af0e",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					inputs: [data],
					target_language_code: detectedLang || "en-IN",
					speaker: "meera",
					model: "bulbul:v1",
					pace: 1.0,
					loudness: 1.0,
					speech_sample_rate: 22050,
					enable_preprocessing: true,
				}),
			});

			if (!ttsResponse.ok) {
				const errorData = await ttsResponse.json();
				throw new Error(errorData.message || "Speech synthesis failed");
			}

			const ttsData = await ttsResponse.json();
			if (!ttsData.audios?.[0]) {
				throw new Error("No audio data received");
			}

			setAudioData(ttsData.audios[0]);
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<div className="container">
			<h1>Voice Orb Translator</h1>

			{/* Orb Container */}
			<div className="orb-container">
				<div
					className={`orb ${isRecording ? "active" : ""}`}
					onClick={isRecording ? stopRecording : startRecording}
				>
					<div className="orb-glow"></div>
					<div className="orb-core"></div>
				</div>
				<div className="orb-status">
					{isRecording ? "Listening..." : "Tap to Speak"}
				</div>
			</div>

			{/* Results Container */}
			<div className="results-container">
				{detectedLanguage && (
					<div className="language-badge">
						{detectedLanguage.replace("-IN", "")}
					</div>
				)}

				{transcript && (
					<div className="transcript-bubble">
						<div className="bubble-content">
							<div className="bubble-text">{transcript}</div>
						</div>
					</div>
				)}

				{audioData && (
					<div className="audio-bubble">
						<audio
							controls
							autoPlay // Auto-play added here
							src={`data:audio/wav;base64,${audioData}`}
						>
							Your browser does not support audio
						</audio>
					</div>
				)}

				{error && <div className="error-bubble">⚠️ {error}</div>}
			</div>

			<style jsx>{`
				.container {
					max-width: 100%;
					min-height: 100vh;
					display: flex;
					flex-direction: column;
					align-items: center;
					background: #1a1a1a;
					padding: 2rem;
					color: white;
				}

				/* Orb Styles */
				.orb-container {
					position: relative;
					margin: 3rem 0;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 1rem;
				}

				.orb {
					width: 150px;
					height: 150px;
					border-radius: 50%;
					cursor: pointer;
					position: relative;
					transition: all 0.3s ease;
				}

				.orb-core {
					position: absolute;
					width: 100%;
					height: 100%;
					border-radius: 50%;
					background: radial-gradient(
						circle at 30% 30%,
						rgba(58, 123, 213, 0.9),
						rgba(41, 128, 185, 0.9)
					);
					filter: blur(15px);
				}

				.orb-glow {
					position: absolute;
					width: 100%;
					height: 100%;
					border-radius: 50%;
					background: rgba(255, 255, 255, 0.1);
					animation: pulse 2s infinite;
				}

				.active .orb-core {
					background: radial-gradient(
						circle at 30% 30%,
						rgba(255, 100, 100, 0.9),
						rgba(200, 50, 50, 0.9)
					);
				}

				.active .orb-glow {
					animation: vibrate 0.15s infinite, pulse-active 1s infinite;
				}

				.orb-status {
					font-size: 1.2rem;
					opacity: 0.8;
					text-transform: uppercase;
					letter-spacing: 2px;
				}

				/* Animations */
				@keyframes pulse {
					0% {
						transform: scale(1);
						opacity: 0.4;
					}
					50% {
						transform: scale(1.1);
						opacity: 0.2;
					}
					100% {
						transform: scale(1);
						opacity: 0.4;
					}
				}

				@keyframes pulse-active {
					0% {
						transform: scale(1);
						opacity: 0.6;
					}
					50% {
						transform: scale(1.2);
						opacity: 0.3;
					}
					100% {
						transform: scale(1);
						opacity: 0.6;
					}
				}

				@keyframes vibrate {
					0% {
						transform: translate(0, 0);
					}
					25% {
						transform: translate(2px, 2px);
					}
					50% {
						transform: translate(-2px, -2px);
					}
					75% {
						transform: translate(1px, -1px);
					}
					100% {
						transform: translate(0, 0);
					}
				}

				/* Results Styles */
				.results-container {
					width: 100%;
					max-width: 600px;
					margin-top: 2rem;
				}

				.language-badge {
					background: rgba(255, 255, 255, 0.1);
					padding: 0.5rem 1rem;
					border-radius: 20px;
					margin: 0.5rem;
					backdrop-filter: blur(5px);
				}

				.transcript-bubble {
					background: rgba(255, 255, 255, 0.9);
					color: #333;
					padding: 1rem;
					border-radius: 15px;
					margin: 1rem 0;
				}

				.audio-bubble {
					background: rgba(255, 255, 255, 0.1);
					border-radius: 15px;
					padding: 1rem;
					margin: 1rem 0;
				}

				.error-bubble {
					background: rgba(255, 50, 50, 0.2);
					color: #ffaaaa;
					padding: 1rem;
					border-radius: 15px;
					margin: 1rem 0;
					border: 1px solid rgba(255, 100, 100, 0.3);
				}

				audio {
					width: 100%;
					filter: invert(1);
				}
			`}</style>
		</div>
	);
}
