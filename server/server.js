const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// In-memory storage for demo purposes
let patientQueue = [];
let queueStats = {
  totalPatients: 0,
  averageWaitTime: 0,
  currentWaitTime: 0
};

// External API configuration
const EXTERNAL_API_URL = 'https://queue-assigner.onrender.com/predict/';

// Helper function to calculate wait times
const calculateWaitTimes = () => {
  const baseWaitTime = 15; // 15 minutes base wait time
  patientQueue.forEach((patient, index) => {
    patient.estimatedWaitTime = baseWaitTime * (index + 1);
  });
  
  if (patientQueue.length > 0) {
    queueStats.currentWaitTime = patientQueue[patientQueue.length - 1].estimatedWaitTime;
    queueStats.averageWaitTime = patientQueue.reduce((sum, p) => sum + p.estimatedWaitTime, 0) / patientQueue.length;
  } else {
    queueStats.currentWaitTime = 0;
    queueStats.averageWaitTime = 0;
  }
};

// Routes

// Get all patients in queue
app.get('/api/queue', (req, res) => {
  try {
    calculateWaitTimes();
    res.json(patientQueue);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Get queue statistics
app.get('/api/queue/stats', (req, res) => {
  try {
    calculateWaitTimes();
    res.json({
      ...queueStats,
      queueLength: patientQueue.length
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

// Get next patient
app.get('/api/queue/next', (req, res) => {
  try {
    if (patientQueue.length === 0) {
      return res.json({ message: 'No patients in queue' });
    }
    
    const nextPatient = patientQueue[0];
    res.json(nextPatient);
  } catch (error) {
    console.error('Error fetching next patient:', error);
    res.status(500).json({ error: 'Failed to fetch next patient' });
  }
});

// Submit patient vital signs and get priority
app.post('/api/patients/vitals', async (req, res) => {
  try {
    const { patientInfo, vitals } = req.body;
    
    // Validate required fields
    if (!patientInfo || !vitals) {
      return res.status(400).json({ error: 'Patient info and vitals are required' });
    }

    // Prepare data for external API
    const apiData = {
      age: parseInt(patientInfo.age),
      gender: patientInfo.gender,
      heart_rate: parseFloat(vitals.heartRate),
      systolic_bp: parseFloat(vitals.systolicBP),
      diastolic_bp: parseFloat(vitals.diastolicBP),
      respiratory_rate: parseFloat(vitals.respiratoryRate),
      body_temperature: parseFloat(vitals.bodyTemperature),
      oxygen_saturation: parseFloat(vitals.oxygenSaturation)
    };

    let priority = 3; // Default priority
    let riskLevel = 'Low';

    try {
      // Call external API for priority assignment
      const response = await axios.post(EXTERNAL_API_URL, apiData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.priority !== undefined) {
        priority = response.data.priority;
        riskLevel = response.data.risk_level || 'Unknown';
      }
    } catch (apiError) {
      console.error('External API error:', apiError.message);
      // Continue with default priority if external API fails
    }

    // Create patient record
    const patient = {
      id: uuidv4(),
      ...patientInfo,
      vitals,
      priority,
      riskLevel,
      checkInTime: new Date().toISOString(),
      estimatedWaitTime: 0
    };

    // Insert patient in queue based on priority (1 = highest, 5 = lowest)
    let insertIndex = patientQueue.length;
    for (let i = 0; i < patientQueue.length; i++) {
      if (priority < patientQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    patientQueue.splice(insertIndex, 0, patient);
    queueStats.totalPatients++;
    
    calculateWaitTimes();
    
    res.json({
      success: true,
      patient,
      queuePosition: insertIndex + 1,
      estimatedWaitTime: patient.estimatedWaitTime
    });
    
  } catch (error) {
    console.error('Error processing patient vitals:', error);
    res.status(500).json({ error: 'Failed to process patient vitals' });
  }
});

// Remove patient from queue
app.delete('/api/queue/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    const initialLength = patientQueue.length;
    
    patientQueue = patientQueue.filter(patient => patient.id !== patientId);
    
    if (patientQueue.length === initialLength) {
      return res.status(404).json({ error: 'Patient not found in queue' });
    }
    
    calculateWaitTimes();
    res.json({ success: true, message: 'Patient removed from queue' });
  } catch (error) {
    console.error('Error removing patient from queue:', error);
    res.status(500).json({ error: 'Failed to remove patient from queue' });
  }
});

// Clear entire queue
app.delete('/api/queue', (req, res) => {
  try {
    patientQueue = [];
    queueStats = {
      totalPatients: 0,
      averageWaitTime: 0,
      currentWaitTime: 0
    };
    res.json({ success: true, message: 'Queue cleared' });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Healthcare Kiosk Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;