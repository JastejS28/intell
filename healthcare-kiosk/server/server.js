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
    
    console.log('External queue data:', externalQueue);
    
    // The external API is the source of truth. We just add names back.
    const refreshedQueue = externalQueue.map(patient => {
      const patientId = patient.id || '';
      return {
        ...patient,
        patientId: patientId, // Add patientId for frontend compatibility
        name: patientNameMap.get(patientId) || `Patient ${patientId.slice(-4)}`, // Fallback name
        // Ensure all required fields are present
        risk_level: patient.risk_level || 'Unknown',
        priority_score: patient.priority_score || 0,
        queue_position: patient.queue_position || 0,
        estimated_wait_time: patient.estimated_wait_time || 0,
        check_in_time: patient.check_in_time || new Date().toISOString(),
        // Add priorityInfo for client compatibility
        priorityInfo: {
          risk_level: patient.risk_level || 'Unknown',
          priority_score: patient.priority_score || 0,
          estimated_wait_time: patient.estimated_wait_time || 0
        }
      };
    });
    
    patientsQueue = refreshedQueue; // Update our local cache
    return refreshedQueue;
  } catch (error) {
    console.error("Error fetching external queue:", error.message);
    return patientsQueue; // Return cached data if external API fails
  }
};

// Submit patient vitals and get priority
app.post('/api/patients/vitals', async (req, res) => {
  try {
    const patientData = { ...req.body };
    const timestamp = new Date().getTime();
    const externalPatientId = `${patientData.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    // Store the name for this ID
    patientNameMap.set(externalPatientId, patientData.name);

    // Prepare data for external API
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
    console.log('Patient data being sent:', JSON.stringify(patientForQueueUpdate, null, 2));
    
    // Add patient to external queue
    await axios.post(`${QUEUE_ASSIGNER_API}/queue/update-priorities/`, [patientForQueueUpdate]);
    
    // Wait a moment for the external API to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch the updated queue from the source of truth
    const updatedQueue = await getRefreshedQueue();
    
    const newPatientDetails = updatedQueue.find(p => p.id === externalPatientId);

    if (!newPatientDetails) {
      // If patient not found in external queue, create a fallback response
      const fallbackResponse = {
        id: externalPatientId,
        patientId: externalPatientId,
        name: patientData.name,
        risk_level: 'Medium', // Default risk level
        priority_score: 50,
        queue_position: updatedQueue.length + 1,
        estimated_wait_time: 30,
        check_in_time: new Date().toISOString(),
        checkInTime: new Date().toISOString(),
        vital_signs: patientForQueueUpdate.vital_signs,
        demographics: patientForQueueUpdate.demographics,
        priorityInfo: {
          risk_level: 'Medium',
          priority_score: 50,
          estimated_wait_time: 30
        }
      };
      
      // Add to local queue as fallback
      patientsQueue.push(fallbackResponse);
      
      res.status(200).json({
        success: true,
        data: fallbackResponse
      });
      return;
    }

    // Prepare response with all necessary fields
    const responseData = {
      ...patientData,
      ...newPatientDetails,
      patientId: externalPatientId,
      checkInTime: newPatientDetails.check_in_time,
      queuePosition: newPatientDetails.queue_position,
      priorityInfo: {
        risk_level: newPatientDetails.risk_level,
        priority_score: newPatientDetails.priority_score,
        estimated_wait_time: newPatientDetails.estimated_wait_time
      }
    };

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error submitting vitals:', error.response ? error.response.data : error.message);
    
    // Provide fallback response even on error
    const fallbackResponse = {
      id: `fallback_${Date.now()}`,
      patientId: `fallback_${Date.now()}`,
      name: req.body.name || 'Unknown Patient',
      risk_level: 'Medium',
      priority_score: 50,
      queue_position: patientsQueue.length + 1,
      estimated_wait_time: 30,
      check_in_time: new Date().toISOString(),
      checkInTime: new Date().toISOString(),
      priorityInfo: {
        risk_level: 'Medium',
        priority_score: 50,
        estimated_wait_time: 30
      }
    };
    
    patientsQueue.push(fallbackResponse);
    
    res.status(200).json({
      success: true,
      data: fallbackResponse,
      warning: 'External API unavailable, using fallback data'
    });
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
    console.error('Error getting queue:', error.message);
    // Return cached data if available
    res.status(200).json({
      success: true,
      count: patientsQueue.length,
      data: patientsQueue
    });
  }
});

// Remove a patient from the queue
app.delete('/api/queue/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`Removing patient ${patientId} from queue...`);
    
    // Remove from external API if possible
    try {
      await axios.delete(`${QUEUE_ASSIGNER_API}/queue/${patientId}/`);
    } catch (externalError) {
      console.warn('Could not remove from external API:', externalError.message);
    }
    
    // Remove from local queue
    patientsQueue = patientsQueue.filter(p => p.id !== patientId && p.patientId !== patientId);
    
    // Remove from name map
    patientNameMap.delete(patientId);
    
    // Refresh queue
    const queue = await getRefreshedQueue();
    
    res.status(200).json({
      success: true,
      message: 'Patient removed from queue',
      updatedQueue: queue
    });
  } catch (error) {
    console.error('Error removing patient:', error.message);
    res.status(500).json({ success: false, message: 'Error removing patient from queue' });
  }
});

// Call next patient
app.delete('/api/queue/next', async (req, res) => {
  try {
    console.log('Calling next patient from external API...');
    
    let nextPatient = null;
    
    try {
      const response = await axios.delete(`${QUEUE_ASSIGNER_API}/queue/next/`);
      nextPatient = response.data;
    } catch (externalError) {
      console.warn('External API call failed, using local queue:', externalError.message);
      // Fallback to local queue
      if (patientsQueue.length > 0) {
        nextPatient = patientsQueue[0];
        patientsQueue = patientsQueue.slice(1);
      }
    }

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

// Clear entire queue
app.delete('/api/queue', async (req, res) => {
  try {
    // Clear external queue if possible
    try {
      await axios.delete(`${QUEUE_ASSIGNER_API}/queue/clear/`);
    } catch (externalError) {
      console.warn('Could not clear external queue:', externalError.message);
    }
    
    // Clear local data
    const patientCount = patientsQueue.length;
    patientsQueue = [];
    patientNameMap.clear();
    
    res.status(200).json({
      success: true,
      message: `Cleared ${patientCount} patients from queue`
    });
  } catch (error) {
    console.error('Error clearing queue:', error.message);
    res.status(500).json({ success: false, message: 'Error clearing queue' });
  }
});

// Add regular polling to update queue priorities every 2 minutes
setInterval(async () => {
  try {
    if (patientsQueue.length > 0) {
      console.log('Periodic queue refresh...');
      await getRefreshedQueue();
    }
  } catch (error) {
    console.error('Error in periodic queue refresh:', error.message);
  }
}, 2 * 60 * 1000); // Every 2 minutes

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`External API: ${QUEUE_ASSIGNER_API}`);
  // Fetch initial queue state on startup
  getRefreshedQueue().catch(err => {
    console.warn('Initial queue fetch failed:', err.message);
  });
});