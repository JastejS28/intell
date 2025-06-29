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
const QUEUE_ASSIGNER_API = process.env.QUEUE_ASSIGNER_API || 'https://queue-assigner.onrender.com';

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

// Function to calculate derived vital signs
const calculateDerivedVitals = (vitals, demographics) => {
  // Calculate BMI
  const heightInM = demographics.height_m;
  const weightInKg = demographics.weight_kg;
  const bmi = weightInKg / (heightInM * heightInM);
  
  // Calculate Mean Arterial Pressure (MAP)
  const map = (vitals.systolic_bp + 2 * vitals.diastolic_bp) / 3;
  
  // Calculate Pulse Pressure
  const pulsePressure = vitals.systolic_bp - vitals.diastolic_bp;
  
  // Simple HRV estimation (this would normally require more complex calculation)
  const hrv = Math.max(10, 50 - Math.abs(vitals.heart_rate - 70) * 0.5);
  
  return {
    Derived_BMI: parseFloat(bmi.toFixed(2)),
    Derived_MAP: parseFloat(map.toFixed(2)),
    Derived_Pulse_Pressure: parseFloat(pulsePressure.toFixed(2)),
    Derived_HRV: parseFloat(hrv.toFixed(2))
  };
};

// Function to fetch the entire queue and add names
const getRefreshedQueue = async () => {
  try {
    console.log('🔄 Fetching queue from external API...');
    const response = await axios.get(`${QUEUE_ASSIGNER_API}/queue/`);
    const externalQueue = response.data;
    
    console.log('📋 External queue data:', externalQueue);
    
    // The external API is the source of truth. We just add names back.
    const refreshedQueue = externalQueue.map(patient => {
      // Safety check to ensure patient.id exists
      const patientId = patient.patient_id || patient.id || '';
      return {
        ...patient,
        id: patientId,
        name: patientNameMap.get(patientId) || `Patient ${patientId.slice(-4)}`, // Fallback to id if name not found
        patientId: patientId, // Add patientId for compatibility
        // Ensure queue_position and estimated_wait_time are available
        queue_position: patient.queue_position || 0,
        estimated_wait_time: patient.estimated_wait_time || 0,
        // Add priorityInfo for frontend compatibility
        priorityInfo: {
          risk_level: patient.risk_level,
          priority_score: patient.priority_score,
          estimated_wait_time: patient.estimated_wait_time,
          queue_position: patient.queue_position
        }
      };
    });
    
    patientsQueue = refreshedQueue; // Update our local cache
    console.log('✅ Queue refreshed with', refreshedQueue.length, 'patients');
    return refreshedQueue;
  } catch (error) {
    console.error("❌ Error fetching external queue:", error.message);
    return patientsQueue; // Return cached data if external API fails
  }
};

// Submit patient vitals and get priority
app.post('/api/patients/vitals', async (req, res) => {
  try {
    console.log('\n🏥 === PROCESSING NEW PATIENT ===');
    const patientData = { ...req.body, patientId: uuidv4() };
    const timestamp = new Date().getTime();

    console.log('👤 Patient data received:', {
      name: patientData.name,
      age: patientData.age,
      heartRate: patientData.heartRate
    });

    // Prepare vital signs data for external API (matching VitalSigns schema)
    const vitalsForAPI = {
      Heart_Rate: parseFloat(patientData.heartRate),
      Respiratory_Rate: parseFloat(patientData.respiratoryRate),
      Body_Temperature: parseFloat(patientData.bodyTemperature),
      Oxygen_Saturation: parseInt(patientData.oxygenSaturation),
      Systolic_Blood_Pressure: parseInt(patientData.systolicBP),
      Diastolic_Blood_Pressure: parseInt(patientData.diastolicBP),
      Age: parseFloat(patientData.age),
      Gender: parseInt(patientData.gender),
      Weight_kg: parseFloat(patientData.weight),
      Height_m: parseFloat(patientData.height)
    };

    // Calculate derived vitals
    const derivedVitals = calculateDerivedVitals(
      {
        heart_rate: vitalsForAPI.Heart_Rate,
        systolic_bp: vitalsForAPI.Systolic_Blood_Pressure,
        diastolic_bp: vitalsForAPI.Diastolic_Blood_Pressure
      },
      {
        height_m: vitalsForAPI.Height_m,
        weight_kg: vitalsForAPI.Weight_kg
      }
    );

    // Combine all data for the prediction API
    const predictionData = {
      ...vitalsForAPI,
      ...derivedVitals
    };

    console.log('📤 Sending to prediction API:', predictionData);
    console.log('🔗 Prediction API URL:', `${QUEUE_ASSIGNER_API}/predict/`);
    
    // Call the prediction API to add patient and get priority
    const predictionResponse = await axios.post(`${QUEUE_ASSIGNER_API}/predict/`, predictionData);
    const predictionResult = predictionResponse.data;
    
    console.log('✅ Prediction API response:', predictionResult);
    
    // Now fetch the updated queue to get the patient's details
    const updatedQueue = await getRefreshedQueue();
    
    // Find the newly added patient using timestamp (most recent)
    const newPatientDetails = updatedQueue.find(p => {
      const patientTime = new Date(p.check_in_time || p.timestamp).getTime();
      return Math.abs(patientTime - timestamp) < 10000; // Within 10 seconds
    }) || updatedQueue[updatedQueue.length - 1]; // Fallback to last patient

    if (!newPatientDetails) {
      throw new Error('Patient not found in updated queue');
    }

    // Store the name mapping with the correct patient ID from external API
    const externalPatientId = newPatientDetails.patient_id || newPatientDetails.id;
    patientNameMap.set(externalPatientId, patientData.name);

    console.log('👤 Patient details from queue:', {
      id: externalPatientId,
      name: patientData.name,
      position: newPatientDetails.queue_position,
      risk: newPatientDetails.risk_level,
      waitTime: newPatientDetails.estimated_wait_time
    });

    const responseData = {
      ...patientData,
      id: externalPatientId,
      patientId: externalPatientId,
      name: patientData.name,
      queue_position: newPatientDetails.queue_position,
      estimated_wait_time: newPatientDetails.estimated_wait_time,
      risk_level: newPatientDetails.risk_level,
      priority_score: newPatientDetails.priority_score,
      priorityInfo: {
        risk_level: newPatientDetails.risk_level,
        priority_score: newPatientDetails.priority_score,
        estimated_wait_time: newPatientDetails.estimated_wait_time,
        queue_position: newPatientDetails.queue_position
      },
      checkInTime: newPatientDetails.check_in_time || new Date().toISOString(),
      timestamp: newPatientDetails.check_in_time || new Date().toISOString()
    };

    console.log('✅ === PATIENT PROCESSING COMPLETE ===\n');

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error submitting vitals:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting patient data',
      error: error.message 
    });
  }
});

// Get all patients in the queue
app.get('/api/queue', async (req, res) => {
  try {
    console.log('\n📋 === QUEUE REQUEST ===');
    const queue = await getRefreshedQueue();
    
    console.log('📤 Returning queue with', queue.length, 'patients');
    
    res.status(200).json({
      success: true,
      count: queue.length,
      data: queue
    });
  } catch (error) {
    console.error('❌ Error getting queue data:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting queue data',
      count: 0,
      data: []
    });
  }
});

// Remove a patient from the queue
app.delete('/api/queue/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`\n🗑️ === REMOVING PATIENT ${patientId} ===`);
    
    // Remove from external API (if it supports individual removal)
    // For now, we'll remove from local cache and let the next refresh sync
    const initialLength = patientsQueue.length;
    patientsQueue = patientsQueue.filter(p => p.id !== patientId && p.patientId !== patientId);
    
    // Remove the patient's name from our map
    patientNameMap.delete(patientId);
    
    console.log(`📊 Removed from local cache. Before: ${initialLength}, After: ${patientsQueue.length}`);
    
    // Refresh from external API to get updated queue
    const updatedQueue = await getRefreshedQueue();
    
    res.status(200).json({
      success: true,
      message: 'Patient removed from queue',
      removedCount: initialLength - patientsQueue.length,
      updatedQueue: updatedQueue
    });
    
  } catch (error) {
    console.error('❌ Error removing patient:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error removing patient from queue'
    });
  }
});

// Call next patient (using external API)
app.delete('/api/queue/next', async (req, res) => {
  try {
    console.log('\n📞 === CALLING NEXT PATIENT (EXTERNAL API) ===');
    console.log('🔗 Calling external API:', `${QUEUE_ASSIGNER_API}/queue/next/`);
    
    // Call the external API to get next patient
    const response = await axios.delete(`${QUEUE_ASSIGNER_API}/queue/next/`);
    const nextPatient = response.data;
    
    console.log('👨‍⚕️ External API response:', nextPatient);

    // Remove the patient's name from our map if they exist
    if (nextPatient && (nextPatient.patient_id || nextPatient.id)) {
      const patientId = nextPatient.patient_id || nextPatient.id;
      const patientName = patientNameMap.get(patientId);
      patientNameMap.delete(patientId);
      
      console.log('👤 Called patient:', {
        id: patientId,
        name: patientName,
        risk: nextPatient.risk_level
      });
    }

    // Refresh the queue from the source of truth
    const updatedQueue = await getRefreshedQueue();
    
    console.log('📋 Queue updated. Remaining patients:', updatedQueue.length);

    // Format response for frontend compatibility
    const responseData = {
      success: true,
      nextPatient: nextPatient ? {
        patient_id: nextPatient.patient_id || nextPatient.id,
        patientId: nextPatient.patient_id || nextPatient.id,
        name: patientNameMap.get(nextPatient.patient_id || nextPatient.id) || `Patient ${(nextPatient.patient_id || nextPatient.id).slice(-4)}`,
        risk_level: nextPatient.risk_level,
        priority_score: nextPatient.priority_score,
        queue_position: 1,
        estimated_wait_time: 0
      } : null,
      updatedQueue: updatedQueue,
      message: nextPatient ? 
        `Called ${patientNameMap.get(nextPatient.patient_id || nextPatient.id) || 'Patient'} (${nextPatient.risk_level} priority)` : 
        'No patients in queue',
      removedCount: nextPatient ? 1 : 0
    };

    console.log('✅ === CALL NEXT PATIENT COMPLETE ===\n');

    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error calling next patient:', error.response ? error.response.data : error.message);
    
    // Check if it's a "no patients" error from external API
    if (error.response && error.response.status === 404) {
      res.status(200).json({
        success: true,
        nextPatient: null,
        updatedQueue: [],
        message: 'No patients in queue',
        removedCount: 0
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error calling next patient',
        error: error.message 
      });
    }
  }
});

// Clear entire queue (using external API)
app.delete('/api/queue', async (req, res) => {
  try {
    console.log('\n🧹 === CLEARING QUEUE ===');
    
    // Clear external queue
    await axios.delete(`${QUEUE_ASSIGNER_API}/queue/clear/`);
    
    // Clear local data
    const patientCount = patientsQueue.length;
    patientsQueue = [];
    patientNameMap.clear();
    
    console.log(`✅ Cleared ${patientCount} patients from queue`);
    
    res.status(200).json({
      success: true,
      message: `Cleared ${patientCount} patients from queue`,
      clearedCount: patientCount
    });
    
  } catch (error) {
    console.error('❌ Error clearing queue:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error clearing queue'
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test external API connectivity
    const externalResponse = await axios.get(`${QUEUE_ASSIGNER_API}/queue/`);
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      externalApiStatus: 'connected',
      queueLength: patientsQueue.length,
      externalQueueLength: externalResponse.data.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      externalApiStatus: 'disconnected',
      queueLength: patientsQueue.length,
      error: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Healthcare Kiosk Server running on port ${PORT}`);
  console.log('🔗 Using external API:', QUEUE_ASSIGNER_API);
  console.log('📋 Queue management system initialized (EXTERNAL API MODE)');
  console.log('');
  console.log('🌐 External API endpoints:');
  console.log(`   - GET  ${QUEUE_ASSIGNER_API}/queue/`);
  console.log(`   - POST ${QUEUE_ASSIGNER_API}/predict/`);
  console.log(`   - DELETE ${QUEUE_ASSIGNER_API}/queue/next/`);
  console.log(`   - DELETE ${QUEUE_ASSIGNER_API}/queue/clear/`);
  console.log('');
  console.log('🏠 Local API endpoints:');
  console.log(`   - GET  http://localhost:${PORT}/api/queue`);
  console.log(`   - POST http://localhost:${PORT}/api/patients/vitals`);
  console.log(`   - DELETE http://localhost:${PORT}/api/queue/next`);
  console.log(`   - GET  http://localhost:${PORT}/api/health`);
  console.log('');
  
  // Fetch initial queue state on startup
  getRefreshedQueue().then(() => {
    console.log('✅ Initial queue state loaded');
  }).catch(err => {
    console.error('❌ Failed to load initial queue state:', err.message);
  });
});