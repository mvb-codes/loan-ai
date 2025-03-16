import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import ButtonGradient from "./assets/svg/ButtonGradient";
import Benefits from "./components/Benefits";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Speech_to_txt from "./components/chat";

const App = () => {
	return (
		<Router>
			{/* Main content wrapped in Routes */}
			<Routes>
				<Route
					path="/"
					element={
						<div className="pt-[4.75rem] lg:pt-[5.25rem] overflow-hidden">
							<Hero />
							<Benefits />
							<Footer />
						</div>
					}
				/>
				<Route path="/chat" element={<Speech_to_txt />} />
			</Routes>

			{/* ButtonGradient is outside Routes but inside Router */}
			<ButtonGradient />
		</Router>
	);
};

export default App;
