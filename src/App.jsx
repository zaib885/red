import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { DemoModeProvider } from '@/context/DemoModeContext';
import { RoutesProvider } from '@/context/RoutesContext';
import { SimulationProvider } from '@/context/SimulationContext';
import { Home } from './pages/Home';
import { Tracking } from './pages/Tracking';
import { Driver } from './pages/Driver';
import { LostFound } from './pages/LostFound';
import { Assistant } from './pages/Assistant';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <DemoModeProvider>
      <RoutesProvider>
        <SimulationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tracking/:busId" element={<Tracking />} />
              <Route path="/driver" element={<Driver />} />
              <Route path="/lost-found" element={<LostFound />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SimulationProvider>
      </RoutesProvider>
    </DemoModeProvider>
  );
}
