require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// In-memory storage for patients in the queue
let patientsQueue = [];
// Simple map to store names, as the external API doesn't know them.
let patientNameMap = new Map();

const PORT = process.env.PORT || 5000;
const QUEUE_ASSIGNER_API = process.env.QUEUE_ASSIGNER_API;

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Root route
app.get('/', (req, res) => {
  res.send('Healthcare Kiosk API is running');
});

// Function to fetch the entire queue and add names
const getRefreshedQueue = async () => {
  try {
    const response = await axios.get(`${QUEUE_ASSIGNER_API}/queue/`);
    const externalQueue = response.data;
    
    // Safer handling of data to avoid 'includes' on undefined
    console.log('External queue data:', externalQueue);
    
    // The external API is the source of truth. We just add names back.
    const refreshedQueue = externalQueue.map(patient => {
      // Safety check to ensure patient.id exists
      const patientId = patient.id || '';
      return {
        ...patient,
        name: patientNameMap.get(patientId) || patientId // Fallback to id if name not found
      };
    });
    
    patientsQueue = refreshedQueue; // Update our local cache
    return refreshedQueue;
  } catch (error) {
    console.error("Error fetching external queue:", error.message);
    return null;
  }
};

// Submit patient vitals and get priority
app.post('/api/patients/vitals', async (req, res) => {
  try {
    const patientData = { ...req.body, patientId: uuidv4() };
    const timestamp = new Date().getTime();
    const externalPatientId = `${patientData.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    // Store the name for this ID
    patientNameMap.set(externalPatientId, patientData.name);

    const patientForQueueUpdate = {
      id: externalPatientId,
      check_in_time: new Date().toISOString(),
      vital_signs: {
        heart_rate: parseFloat(patientData.heartRate),
        respiratory_rate: parseFloat(patientData.respiratoryRate),
        body_temperature: parseFloat(patientData.bodyTemperature),
        oxygen_saturation: parseInt(patientData.oxygenSaturation),
        systolic_bp: parseInt(patientData.systolicBP),
        diastolic_bp: parseInt(patientData.diastolicBP)
      },
      demographics: {
        age: parseFloat(patientData.age),
        gender: parseInt(patientData.gender),
        weight_kg: parseFloat(patientData.weight),
        height_m: parseFloat(patientData.height)
      }
    };

    console.log('Adding new patient and updating priorities...');
    await axios.post(`${QUEUE_ASSIGNER_API}/queue/update-priorities/`, [patientForQueueUpdate]);
    
    // Now, fetch the entire, updated queue from the source of truth
    const updatedQueue = await getRefreshedQueue();
    
    const newPatientDetails = updatedQueue.find(p => p.id === externalPatientId);

    res.status(200).json({
      success: true,
      data: {
        ...patientData,
        ...newPatientDetails, // This now contains correct position and wait time
        priorityInfo: newPatientDetails // For client-side compatibility
      }
    });

  } catch (error) {
    console.error('Error submitting vitals:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Error submitting patient data' });
  }
});

// Get all patients in the queue
app.get('/api/queue', async (req, res) => {
  try {
    const queue = await getRefreshedQueue();
    res.status(200).json({
      success: true,
      count: queue.length,
      data: queue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting queue data' });
  }
});

// Remove a patient from the queue
app.delete('/api/queue/next', async (req, res) => {
  try {
    console.log('Calling next patient from external API...');
    const response = await axios.delete(`${QUEUE_ASSIGNER_API}/queue/next/`);
    const nextPatient = response.data;

    // Remove the patient's name from our map
    if (nextPatient && nextPatient.id) {
      patientNameMap.delete(nextPatient.id);
    }

    // Refresh the queue from the source of truth
    const queue = await getRefreshedQueue();

    res.status(200).json({
      success: true,
      nextPatient: nextPatient,
      updatedQueue: queue
    });
  } catch (error) {
    console.error('Error calling next patient:', error.message);
    res.status(500).json({ success: false, message: 'Error calling next patient' });
  }
});

// Add regular polling to update queue priorities every 5 minutes (instead of 10)
setInterval(async () => {
  try {
    // Get all patients currently in the queue
    const patientsForUpdate = patientsQueue.map(p => ({
      id: p.id,
      check_in_time: p.check_in_time,
      vital_signs: p.vital_signs,
      demographics: p.demographics
    }));
    
    if (patientsForUpdate.length > 0) {
      // Update priorities and wait times
      console.log('Updating priorities for all patients in queue...');
      await axios.post(`${QUEUE_ASSIGNER_API}/queue/update-priorities/`, patientsForUpdate);
      
      // Refresh queue to get updated data
      await getRefreshedQueue();
    }
  } catch (error) {
    console.error('Error in queue priority update:', error.message);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Fetch initial queue state on startup
  getRefreshedQueue();
});
