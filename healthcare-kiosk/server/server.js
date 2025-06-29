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
    console.log('Fetching queue from external API...');
    const response = await axios.get(`${QUEUE_ASSIGNER_API}/queue/`, {
      timeout: 5000
    });
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
    console.log(`Updated local queue with ${refreshedQueue.length} patients`);
    return refreshedQueue;
  } catch (error) {
    console.error("Error fetching external queue:", error.message);
    console.log(`Returning cached queue with ${patientsQueue.length} patients`);
    return patientsQueue; // Return cached data if external API fails
  }
};

// Submit patient vitals and get priority
app.post('/api/patients/vitals', async (req, res) => {
  try {
    const patientData = { ...req.body };
    const timestamp = new Date().getTime();
    const externalPatientId = `${patientData.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    console.log('Processing patient:', patientData.name);
    
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

    console.log('Sending patient data to external API:', JSON.stringify(patientForQueueUpdate, null, 2));
    
    let newPatientDetails = null;
    let useExternalAPI = true;
    
    try {
      // Add patient to external queue
      await axios.post(`${QUEUE_ASSIGNER_API}/queue/update-priorities/`, [patientForQueueUpdate], {
        timeout: 10000
      });
      
      // Wait a moment for the external API to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch the updated queue from the source of truth
      const updatedQueue = await getRefreshedQueue();
      newPatientDetails = updatedQueue.find(p => p.id === externalPatientId);
      
      if (!newPatientDetails) {
        console.warn('Patient not found in external queue after adding');
        useExternalAPI = false;
      } else {
        console.log('Patient successfully added to external queue:', newPatientDetails);
      }
    } catch (externalError) {
      console.error('External API failed:', externalError.message);
      useExternalAPI = false;
    }

    // If external API failed or patient not found, create fallback response
    if (!useExternalAPI || !newPatientDetails) {
      console.log('Using fallback patient data');
      
      // Determine risk level based on vital signs (simple logic)
      let riskLevel = 'Low';
      let priorityScore = 30;
      
      // High risk conditions
      if (patientData.heartRate > 120 || patientData.heartRate < 50 ||
          patientData.systolicBP > 180 || patientData.systolicBP < 90 ||
          patientData.oxygenSaturation < 90 || patientData.bodyTemperature > 39) {
        riskLevel = 'High';
        priorityScore = 90;
      }
      // Medium risk conditions
      else if (patientData.heartRate > 100 || patientData.heartRate < 60 ||
               patientData.systolicBP > 140 || patientData.systolicBP < 100 ||
               patientData.oxygenSaturation < 95 || patientData.bodyTemperature > 38) {
        riskLevel = 'Medium';
        priorityScore = 60;
      }
      
      newPatientDetails = {
        id: externalPatientId,
        patientId: externalPatientId,
        name: patientData.name,
        risk_level: riskLevel,
        priority_score: priorityScore,
        queue_position: patientsQueue.length + 1,
        estimated_wait_time: riskLevel === 'High' ? 15 : riskLevel === 'Medium' ? 30 : 45,
        check_in_time: new Date().toISOString(),
        vital_signs: patientForQueueUpdate.vital_signs,
        demographics: patientForQueueUpdate.demographics,
        priorityInfo: {
          risk_level: riskLevel,
          priority_score: priorityScore,
          estimated_wait_time: riskLevel === 'High' ? 15 : riskLevel === 'Medium' ? 30 : 45
        }
      };
      
      // Add to local queue
      patientsQueue.push(newPatientDetails);
      
      // Sort queue by priority score (highest first)
      patientsQueue.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      
      // Update queue positions
      patientsQueue.forEach((patient, index) => {
        patient.queue_position = index + 1;
        patient.queuePosition = index + 1;
      });
      
      console.log('Patient added to local queue. Total patients:', patientsQueue.length);
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

    console.log('Sending response to client:', responseData);

    res.status(200).json({
      success: true,
      data: responseData,
      message: useExternalAPI ? 'Patient added successfully' : 'Patient added with fallback data'
    });

  } catch (error) {
    console.error('Error submitting vitals:', error.message);
    
    // Provide fallback response even on error
    const timestamp = Date.now();
    const fallbackId = `fallback_${timestamp}`;
    
    const fallbackResponse = {
      id: fallbackId,
      patientId: fallbackId,
      name: req.body.name || 'Unknown Patient',
      risk_level: 'Medium',
      priority_score: 50,
      queue_position: patientsQueue.length + 1,
      estimated_wait_time: 30,
      check_in_time: new Date().toISOString(),
      checkInTime: new Date().toISOString(),
      vital_signs: {
        heart_rate: req.body.heartRate || 75,
        respiratory_rate: req.body.respiratoryRate || 16,
        body_temperature: req.body.bodyTemperature || 36.6,
        oxygen_saturation: req.body.oxygenSaturation || 98,
        systolic_bp: req.body.systolicBP || 120,
        diastolic_bp: req.body.diastolicBP || 80
      },
      demographics: {
        age: req.body.age || 30,
        gender: req.body.gender || 0,
        weight_kg: req.body.weight || 70,
        height_m: req.body.height || 1.7
      },
      priorityInfo: {
        risk_level: 'Medium',
        priority_score: 50,
        estimated_wait_time: 30
      }
    };
    
    patientsQueue.push(fallbackResponse);
    patientNameMap.set(fallbackId, req.body.name || 'Unknown Patient');
    
    console.log('Added fallback patient. Total patients:', patientsQueue.length);
    
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
    console.log('Queue endpoint called');
    
    // Try to refresh from external API first
    let queue = await getRefreshedQueue();
    
    // If external API returned empty but we have local data, use local data
    if (queue.length === 0 && patientsQueue.length > 0) {
      console.log('External API returned empty, using local queue');
      queue = patientsQueue;
    }
    
    console.log(`Returning queue with ${queue.length} patients`);
    
    res.status(200).json({
      success: true,
      count: queue.length,
      data: queue
    });
  } catch (error) {
    console.error('Error getting queue:', error.message);
    // Return cached data if available
    console.log(`Returning cached queue with ${patientsQueue.length} patients`);
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
      await axios.delete(`${QUEUE_ASSIGNER_API}/queue/${patientId}/`, {
        timeout: 5000
      });
      console.log('Patient removed from external API');
    } catch (externalError) {
      console.warn('Could not remove from external API:', externalError.message);
    }
    
    // Remove from local queue
    const initialLength = patientsQueue.length;
    patientsQueue = patientsQueue.filter(p => p.id !== patientId && p.patientId !== patientId);
    console.log(`Removed from local queue. Before: ${initialLength}, After: ${patientsQueue.length}`);
    
    // Remove from name map
    patientNameMap.delete(patientId);
    
    // Update queue positions
    patientsQueue.forEach((patient, index) => {
      patient.queue_position = index + 1;
      patient.queuePosition = index + 1;
    });
    
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
    console.log('Calling next patient...');
    
    let nextPatient = null;
    
    try {
      const response = await axios.delete(`${QUEUE_ASSIGNER_API}/queue/next/`, {
        timeout: 5000
      });
      nextPatient = response.data;
      console.log('Next patient from external API:', nextPatient);
    } catch (externalError) {
      console.warn('External API call failed, using local queue:', externalError.message);
      // Fallback to local queue
      if (patientsQueue.length > 0) {
        // Sort by priority score first
        patientsQueue.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        nextPatient = patientsQueue[0];
        patientsQueue = patientsQueue.slice(1);
        
        // Update queue positions
        patientsQueue.forEach((patient, index) => {
          patient.queue_position = index + 1;
          patient.queuePosition = index + 1;
        });
        
        console.log('Next patient from local queue:', nextPatient);
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
    console.log('Clearing entire queue...');
    
    // Clear external queue if possible
    try {
      await axios.delete(`${QUEUE_ASSIGNER_API}/queue/clear/`, {
        timeout: 5000
      });
      console.log('External queue cleared');
    } catch (externalError) {
      console.warn('Could not clear external queue:', externalError.message);
    }
    
    // Clear local data
    const patientCount = patientsQueue.length;
    patientsQueue = [];
    patientNameMap.clear();
    
    console.log(`Cleared ${patientCount} patients from local queue`);
    
    res.status(200).json({
      success: true,
      message: `Cleared ${patientCount} patients from queue`
    });
  } catch (error) {
    console.error('Error clearing queue:', error.message);
    res.status(500).json({ success: false, message: 'Error clearing queue' });
  }
});

// Add regular polling to update queue priorities every 30 seconds
setInterval(async () => {
  try {
    if (patientsQueue.length > 0) {
      console.log('Periodic queue refresh...');
      await getRefreshedQueue();
    }
  } catch (error) {
    console.error('Error in periodic queue refresh:', error.message);
  }
}, 30 * 1000); // Every 30 seconds

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`External API: ${QUEUE_ASSIGNER_API}`);
  // Fetch initial queue state on startup
  getRefreshedQueue().catch(err => {
    console.warn('Initial queue fetch failed:', err.message);
  });
});