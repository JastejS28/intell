require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for patients in the queue
let patientsQueue = [];
let patientCounter = 1;

const PORT = process.env.PORT || 5000;

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Helper function to calculate risk level
function calculateRiskLevel(vitals) {
  let riskScore = 0;
  let riskLevel = 'Low';
  
  // Heart rate scoring
  if (vitals.heartRate > 120 || vitals.heartRate < 50) {
    riskScore += 30;
  } else if (vitals.heartRate > 100 || vitals.heartRate < 60) {
    riskScore += 15;
  }
  
  // Blood pressure scoring
  if (vitals.systolicBP > 180 || vitals.systolicBP < 90) {
    riskScore += 35;
  } else if (vitals.systolicBP > 140 || vitals.systolicBP < 100) {
    riskScore += 20;
  }
  
  // Oxygen saturation scoring
  if (vitals.oxygenSaturation < 90) {
    riskScore += 40;
  } else if (vitals.oxygenSaturation < 95) {
    riskScore += 20;
  }
  
  // Temperature scoring
  if (vitals.bodyTemperature > 39 || vitals.bodyTemperature < 35) {
    riskScore += 25;
  } else if (vitals.bodyTemperature > 38 || vitals.bodyTemperature < 36) {
    riskScore += 10;
  }
  
  // Respiratory rate scoring
  if (vitals.respiratoryRate > 25 || vitals.respiratoryRate < 12) {
    riskScore += 20;
  } else if (vitals.respiratoryRate > 20 || vitals.respiratoryRate < 14) {
    riskScore += 10;
  }
  
  // Age factor
  if (vitals.age > 75) {
    riskScore += 15;
  } else if (vitals.age > 65) {
    riskScore += 10;
  }
  
  // Determine risk level
  if (riskScore >= 60) {
    riskLevel = 'High';
  } else if (riskScore >= 30) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }
  
  return { riskLevel, riskScore };
}

// Helper function to calculate priority score
function calculatePriorityScore(riskLevel, riskScore, age) {
  let priorityScore = 0;
  
  // Base priority by risk level
  switch (riskLevel) {
    case 'High':
      priorityScore = 80 + riskScore;
      break;
    case 'Medium':
      priorityScore = 40 + riskScore;
      break;
    case 'Low':
      priorityScore = 10 + riskScore;
      break;
  }
  
  // Age adjustment
  if (age > 75) {
    priorityScore += 10;
  } else if (age > 65) {
    priorityScore += 5;
  }
  
  return Math.min(priorityScore, 100); // Cap at 100
}

// Helper function to calculate estimated wait time
function calculateWaitTime(position, riskLevel) {
  const baseTimePerPatient = {
    'High': 15,
    'Medium': 20,
    'Low': 25
  };
  
  const baseTime = baseTimePerPatient[riskLevel] || 20;
  return Math.max(0, (position - 1) * baseTime);
}

// Helper function to sort and update queue
function sortAndUpdateQueue() {
  // Sort queue by priority score (highest first)
  patientsQueue.sort((a, b) => b.priority_score - a.priority_score);
  
  // Update queue positions and wait times
  patientsQueue.forEach((patient, index) => {
    const position = index + 1;
    const waitTime = calculateWaitTime(position, patient.risk_level);
    
    patient.queue_position = position;
    patient.queuePosition = position;
    patient.estimated_wait_time = waitTime;
    
    if (patient.priorityInfo) {
      patient.priorityInfo.queue_position = position;
      patient.priorityInfo.estimated_wait_time = waitTime;
    }
  });
  
  console.log('Queue sorted and updated. Current order:', patientsQueue.map(p => ({
    name: p.name,
    position: p.queue_position,
    risk: p.risk_level,
    priority: p.priority_score.toFixed(1)
  })));
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Healthcare Kiosk API is running',
    timestamp: new Date().toISOString(),
    queueLength: patientsQueue.length
  });
});

// Submit patient vitals and get priority
app.post('/api/patients/vitals', (req, res) => {
  try {
    console.log('\n=== PROCESSING NEW PATIENT ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const patientData = req.body;
    const timestamp = new Date();
    const patientId = `patient_${patientCounter++}_${timestamp.getTime()}`;
    
    // Calculate risk assessment
    const { riskLevel, riskScore } = calculateRiskLevel(patientData);
    const priorityScore = calculatePriorityScore(riskLevel, riskScore, patientData.age);
    
    console.log('Risk Assessment:', { riskLevel, riskScore, priorityScore });
    
    // Create comprehensive patient object
    const newPatient = {
      // Basic identifiers
      id: patientId,
      patientId: patientId,
      name: patientData.name || `Patient ${patientCounter - 1}`,
      
      // Risk and priority
      risk_level: riskLevel,
      priority_score: priorityScore,
      confidence_score: 0.85,
      
      // Queue information (will be updated after sorting)
      queue_position: 1,
      queuePosition: 1,
      estimated_wait_time: 0,
      
      // Timestamps
      check_in_time: timestamp.toISOString(),
      checkInTime: timestamp.toISOString(),
      timestamp: timestamp.toISOString(),
      
      // Vital signs
      vital_signs: {
        heart_rate: parseInt(patientData.heartRate),
        respiratory_rate: parseInt(patientData.respiratoryRate),
        body_temperature: parseFloat(patientData.bodyTemperature),
        oxygen_saturation: parseInt(patientData.oxygenSaturation),
        systolic_bp: parseInt(patientData.systolicBP),
        diastolic_bp: parseInt(patientData.diastolicBP)
      },
      
      // Demographics
      demographics: {
        age: parseInt(patientData.age),
        gender: parseInt(patientData.gender),
        weight_kg: parseFloat(patientData.weight),
        height_m: parseFloat(patientData.height)
      },
      
      // Priority info for compatibility
      priorityInfo: {
        risk_level: riskLevel,
        priority_score: priorityScore,
        estimated_wait_time: 0,
        queue_position: 1
      }
    };
    
    console.log('Created patient object:', {
      id: newPatient.id,
      name: newPatient.name,
      risk: newPatient.risk_level,
      priority: newPatient.priority_score
    });
    
    // Add to queue
    patientsQueue.push(newPatient);
    console.log(`Added to queue. Total patients: ${patientsQueue.length}`);
    
    // Sort and update queue
    sortAndUpdateQueue();
    
    // Find the newly added patient
    const addedPatient = patientsQueue.find(p => p.id === patientId);
    
    if (!addedPatient) {
      throw new Error('Patient not found after adding to queue');
    }
    
    console.log('Patient successfully added at position:', addedPatient.queue_position);
    console.log('=== PATIENT PROCESSING COMPLETE ===\n');
    
    // Return the patient data
    res.status(200).json({
      success: true,
      data: addedPatient,
      message: `Patient added to queue at position ${addedPatient.queue_position}`
    });
    
  } catch (error) {
    console.error('=== ERROR PROCESSING PATIENT ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Error processing patient data',
      error: error.message
    });
  }
});

// Get all patients in the queue
app.get('/api/queue', (req, res) => {
  try {
    console.log('\n=== QUEUE REQUEST ===');
    console.log(`Current queue length: ${patientsQueue.length}`);
    
    if (patientsQueue.length === 0) {
      console.log('Queue is empty');
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Ensure queue is properly sorted
    sortAndUpdateQueue();
    
    console.log('Returning queue data for patients:', patientsQueue.map(p => ({
      id: p.id,
      name: p.name,
      position: p.queue_position,
      risk: p.risk_level,
      priority: p.priority_score.toFixed(1)
    })));
    
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
app.delete('/api/queue/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`\n=== REMOVING PATIENT ${patientId} ===`);
    
    const initialLength = patientsQueue.length;
    patientsQueue = patientsQueue.filter(p => p.id !== patientId && p.patientId !== patientId);
    
    console.log(`Removed from queue. Before: ${initialLength}, After: ${patientsQueue.length}`);
    
    // Sort and update remaining queue
    if (patientsQueue.length > 0) {
      sortAndUpdateQueue();
    }
    
    res.status(200).json({
      success: true,
      message: 'Patient removed from queue',
      removedCount: initialLength - patientsQueue.length,
      updatedQueue: patientsQueue
    });
    
  } catch (error) {
    console.error('Error removing patient:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error removing patient from queue'
    });
  }
});

// Call next patient (remove highest priority patient) - FIXED VERSION
app.delete('/api/queue/next', (req, res) => {
  try {
    console.log('\n=== CALLING NEXT PATIENT ===');
    console.log(`Current queue length: ${patientsQueue.length}`);
    
    if (patientsQueue.length === 0) {
      console.log('No patients in queue');
      return res.status(200).json({
        success: true,
        message: 'No patients in queue',
        nextPatient: null,
        updatedQueue: []
      });
    }
    
    // Ensure queue is properly sorted by priority
    sortAndUpdateQueue();
    
    // Remove the first (highest priority) patient
    const nextPatient = patientsQueue.shift();
    
    console.log('Next patient called:', {
      id: nextPatient.id,
      name: nextPatient.name,
      risk: nextPatient.risk_level,
      priority: nextPatient.priority_score.toFixed(1),
      position: nextPatient.queue_position
    });
    
    // Update remaining queue positions and wait times
    if (patientsQueue.length > 0) {
      sortAndUpdateQueue();
    }
    
    console.log(`Queue updated. Remaining patients: ${patientsQueue.length}`);
    console.log('Updated queue:', patientsQueue.map(p => ({
      name: p.name,
      position: p.queue_position,
      risk: p.risk_level
    })));
    
    res.status(200).json({
      success: true,
      nextPatient: {
        patient_id: nextPatient.id,
        patientId: nextPatient.id,
        name: nextPatient.name,
        risk_level: nextPatient.risk_level,
        priority_score: nextPatient.priority_score,
        queue_position: 1, // They were first in line
        estimated_wait_time: 0
      },
      updatedQueue: patientsQueue,
      message: `Called ${nextPatient.name} (${nextPatient.risk_level} priority)`,
      removedCount: 1
    });
    
  } catch (error) {
    console.error('Error calling next patient:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error calling next patient',
      error: error.message
    });
  }
});

// Clear entire queue
app.delete('/api/queue', (req, res) => {
  try {
    console.log('\n=== CLEARING QUEUE ===');
    
    const patientCount = patientsQueue.length;
    patientsQueue = [];
    patientCounter = 1; // Reset counter
    
    console.log(`Cleared ${patientCount} patients from queue`);
    
    res.status(200).json({
      success: true,
      message: `Cleared ${patientCount} patients from queue`,
      clearedCount: patientCount
    });
    
  } catch (error) {
    console.error('Error clearing queue:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error clearing queue'
    });
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
      position: p.queue_position,
      priority: p.priority_score.toFixed(1)
    }))
  });
});

// Debug endpoint to see raw queue data
app.get('/api/debug/queue', (req, res) => {
  res.status(200).json({
    queueLength: patientsQueue.length,
    patientCounter: patientCounter,
    rawQueue: patientsQueue
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Healthcare Kiosk Server running on port ${PORT}`);
  console.log('📋 Queue management system initialized');
  console.log('🔗 API endpoints available:');
  console.log(`   - GET  http://localhost:${PORT}/api/queue`);
  console.log(`   - POST http://localhost:${PORT}/api/patients/vitals`);
  console.log(`   - DELETE http://localhost:${PORT}/api/queue/next`);
  console.log(`   - GET  http://localhost:${PORT}/api/health`);
  console.log(`   - GET  http://localhost:${PORT}/api/debug/queue`);
  console.log('');
});