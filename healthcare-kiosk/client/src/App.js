import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';

// Import Pages
import LandingPage from './pages/LandingPage';
import PatientInfoPage from './pages/PatientInfoPage';
import VitalSignsPage from './pages/VitalSignsPage';
import QueueStatusPage from './pages/QueueStatusPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';

// Import Components
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <Box 
        className="kiosk-fullscreen"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <Header />
        
        <Container 
          component="main" 
          maxWidth="lg" 
          sx={{ 
            flexGrow: 1, 
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            height: '100%'
          }}
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/patient-info" element={<PatientInfoPage />} />
            <Route path="/vital-signs" element={<VitalSignsPage />} />
            <Route path="/queue-status" element={<QueueStatusPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Container>
        
        <Footer />
      </Box>
    </Router>
  );
}

export default App;
