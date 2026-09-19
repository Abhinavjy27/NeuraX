import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Results from "./pages/Results";
import GraphPage from "./pages/Graph";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results/:jobId" element={<Results />} />
        <Route path="/graph/:jobId" element={<GraphPage />} />
      </Routes>
    </BrowserRouter>
  );
}
