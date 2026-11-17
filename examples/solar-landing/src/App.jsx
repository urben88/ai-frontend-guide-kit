import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Presupuesto from './pages/Presupuesto.jsx';
import Gracias from './pages/Gracias.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/presupuesto" element={<Presupuesto />} />
      <Route path="/gracias" element={<Gracias />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
