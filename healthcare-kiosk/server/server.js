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

// Submit patient vitals and get priority
app.post('/api/patients/vitals', async (req, res) => {
  try {
    const patientData = { ...req.body };
    const timestamp = new Date().getTime();
    const externalPatientId = `${patientData.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    console.log('Processing patient:', patientData.name);
    console.log('Patient data received:', JSON.stringify(patientData, null, 2));
    
    // Store the name for this ID
    patientNameMap.set(externalPatientId, patientData.name);

    // Determine risk level based on vital signs (simple but effective logic)
    let riskLevel = 'Low';
    let priorityScore = 30;
    let estimatedWaitTime = 45;
    
    // High risk conditions - any critical vital sign
    if (patientData.heartRate > 120 || patientData.heartRate < 50 ||
        patientData.systolicBP > 180 || patientData.systolicBP < 90 ||
        patientData.oxygenSaturation < 90 || 
        patientData.bodyTemperature > 39 || patientData.bodyTemperature < 35 ||
        patientData.respiratoryRate > 25 || patientData.respiratoryRate < 12) {
      riskLevel = 'High';
      priorityScore = 90 + Math.random() * 10; // 90-100
      estimatedWaitTime = 5;
    }
    // Medium risk conditions
    else if (patientData.heartRate > 100 || patientData.heartRate < 60 ||
             patientData.systolicBP > 140 || patientData.systolicBP < 100 ||
             patientData.oxygenSaturation < 95 || 
             patientData.bodyTemperature > 38 || patientData.bodyTemperature < 36 ||
             patientData.age > 65) {
      riskLevel = 'Medium';
      priorityScore = 50 + Math.random() * 20; // 50-70
      estimatedWaitTime = 20;
    }
    
    // Create patient object
    const newPatientDetails = {
      id: externalPatientId,
      patientId: externalPatientId,
      name: patientData.name,
      risk_level: riskLevel,
      priority_score: priorityScore,
      confidence_score: 0.85,
      queue_position: 1, // Will be updated when we sort
      estimated_wait_time: estimatedWaitTime,
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
      },
      priorityInfo: {
        risk_level: riskLevel,
        priority_score: priorityScore,
        estimated_wait_time: estimatedWaitTime
      }
    };
    
    // Add to local queue
    patientsQueue.push(newPatientDetails);
    
    // Sort queue by priority score (highest first)
    patientsQueue.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    
    // Update queue positions and wait times
    patientsQueue.forEach((patient, index) => {
      patient.queue_position = index + 1;
      patient.queuePosition = index + 1;
      
      // Calculate cumulative wait time
      let cumulativeWait = 0;
      for (let i = 0; i < index; i++) {
        const prevPatient = patientsQueue[i];
        const baseTime = prevPatient.risk_level === 'High' ? 15 : 
                        prevPatient.risk_level === 'Medium' ? 20 : 25;
        cumulativeWait += baseTime;
      }
      patient.estimated_wait_time = cumulativeWait;
      patient.priorityInfo.estimated_wait_time = cumulativeWait;
    });
    
    console.log('Patient successfully processed and added to queue');
    console.log(`Total patients in queue: ${patientsQueue.length}`);

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

    console.log('Sending response to client:', JSON.stringify(responseData, null, 2));

    res.status(200).json({
      success: true,
      data: responseData,
      message: 'Patient added successfully to queue'
    });

  } catch (error) {
    console.error('Error submitting vitals:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: 'Error processing patient data',
      error: error.message 
    });
  }
});

// Get all patients in the queue
app.get('/api/queue', async (req, res) => {
  try {
    console.log('Queue endpoint called');
    console.log(`Returning queue with ${patientsQueue.length} patients`);
    
    // Sort queue by priority before returning
    patientsQueue.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    
    // Update positions
    patientsQueue.forEach((patient, index) => {
      patient.queue_position = index + 1;
      patient.queuePosition = index + 1;
    });
    
    res.status(200).json({
      success: true,
      count: patientsQueue.length,
      data: patientsQueue
    });
  } catch (error) {
    console.error('Error getting queue:', error.message);
    res.status(500).json({
      success: false,
      count: 0,
      data: [],
      error: error.message
    });
  }
});

// Remove a patient from the queue
app.delete('/api/queue/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`Removing patient ${patientId} from queue...`);
    
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
    
    res.status(200).json({
      success: true,
      message: 'Patient removed from queue',
      updatedQueue: patientsQueue
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

    // Remove the patient's name from our map
    if (nextPatient && nextPatient.id) {
      patientNameMap.delete(nextPatient.id);
    }

    res.status(200).json({
      success: true,
      nextPatient: nextPatient,
      updatedQueue: patientsQueue
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    queueLength: patientsQueue.length,
    patients: patientsQueue.map(p => ({ 
      name: p.name, 
      risk: p.risk_level, 
      position: p.queue_position 
    }))
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Server ready to accept requests');
  console.log('Queue management system initialized');
});