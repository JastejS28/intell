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
      const patientId = patient.id || '';
      return {
        ...patient,
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
    const externalPatientId = `${patientData.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    console.log('👤 Patient data received:', {
      name: patientData.name,
      age: patientData.age,
      heartRate: patientData.heartRate
    });

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

    console.log('📤 Sending to external API:', patientForQueueUpdate);
    console.log('🔗 External API URL:', `${QUEUE_ASSIGNER_API}/queue/update-priorities/`);
    
    // Add new patient and update priorities
    await axios.post(`${QUEUE_ASSIGNER_API}/queue/update-priorities/`, [patientForQueueUpdate]);
    console.log('✅ Patient added to external queue');
    
    // Now, fetch the entire, updated queue from the source of truth
    const updatedQueue = await getRefreshedQueue();
    
    const newPatientDetails = updatedQueue.find(p => p.id === externalPatientId);

    if (!newPatientDetails) {
      throw new Error('Patient not found in updated queue');
    }

    console.log('👤 Patient details from queue:', {
      id: newPatientDetails.id,
      name: newPatientDetails.name,
      position: newPatientDetails.queue_position,
      risk: newPatientDetails.risk_level,
      waitTime: newPatientDetails.estimated_wait_time
    });

    const responseData = {
      ...patientData,
      ...newPatientDetails, // This now contains correct position and wait time
      priorityInfo: newPatientDetails, // For client-side compatibility
      checkInTime: newPatientDetails.check_in_time,
      timestamp: newPatientDetails.check_in_time
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
    if (nextPatient && nextPatient.id) {
      const patientName = patientNameMap.get(nextPatient.id);
      patientNameMap.delete(nextPatient.id);
      
      console.log('👤 Called patient:', {
        id: nextPatient.id,
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
        patient_id: nextPatient.id,
        patientId: nextPatient.id,
        name: patientNameMap.get(nextPatient.id) || `Patient ${nextPatient.id.slice(-4)}`,
        risk_level: nextPatient.risk_level,
        priority_score: nextPatient.priority_score,
        queue_position: 1,
        estimated_wait_time: 0
      } : null,
      updatedQueue: updatedQueue,
      message: nextPatient ? 
        `Called ${patientNameMap.get(nextPatient.id) || 'Patient'} (${nextPatient.risk_level} priority)` : 
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

// Add regular polling to update queue priorities every 5 minutes
setInterval(async () => {
  try {
    if (patientsQueue.length > 0) {
      console.log('🔄 Periodic queue refresh...');
      
      // Get all patients currently in the queue
      const patientsForUpdate = patientsQueue.map(p => ({
        id: p.id,
        check_in_time: p.check_in_time,
        vital_signs: p.vital_signs,
        demographics: p.demographics
      }));
      
      // Update priorities and wait times
      console.log('📊 Updating priorities for', patientsForUpdate.length, 'patients...');
      await axios.post(`${QUEUE_ASSIGNER_API}/queue/update-priorities/`, patientsForUpdate);
      
      // Refresh queue to get updated data
      await getRefreshedQueue();
      console.log('✅ Periodic update complete');
    }
  } catch (error) {
    console.error('❌ Error in periodic queue update:', error.message);
  }
}, 5 * 60 * 1000); // Every 5 minutes

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
  console.log(`   - POST ${QUEUE_ASSIGNER_API}/queue/update-priorities/`);
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