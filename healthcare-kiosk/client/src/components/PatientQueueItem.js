import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import moment from 'moment';

const riskLevelColors = {
  'high': 'error',
  'high risk': 'error',
  'medium': 'warning',
  'medium risk': 'warning',
  'low': 'success',
  'low risk': 'success'
};

// Helper function to format wait time
const formatWaitTime = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(parseInt(minutes))) {
    return "Calculating...";
  }
  
  minutes = parseInt(minutes);
  
  if (minutes <= 1) {
    return "< 1 min";
  } else if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  }
};

function PatientQueueItem({ patient, position }) {
  console.log('PatientQueueItem received patient:', patient);
  
  // Format check-in time
  const checkInTime = moment(patient.check_in_time || patient.checkInTime || new Date()).format('hh:mm A');
  
  // Determine risk level color and text directly from the patient object
  const riskLevel = (patient.risk_level || patient.priorityInfo?.risk_level || 'Unknown').toLowerCase();
  const riskLabel = patient.risk_level || patient.priorityInfo?.risk_level || 'Unknown';
  const riskColor = riskLevelColors[riskLevel] || 'info';
  
  // Get patient name
  const patientName = patient.name || `Patient ${(patient.id || patient.patientId || '').slice(-4)}`;
  
  // Get queue position
  const queuePosition = patient.queue_position || patient.queuePosition || position || '?';
  
  // Get estimated wait time
  const estimatedWaitTime = patient.estimated_wait_time || 
                           (patient.priorityInfo && patient.priorityInfo.estimated_wait_time) ||
                           0;
  
  // Get vital signs data
  const vitalSigns = patient.vital_signs || {};
  const demographics = patient.demographics || {};
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        border: '1px solid',
        borderColor: (theme) => theme.palette[riskColor].main,
        boxShadow: (theme) => `0 4px 12px ${theme.palette[riskColor].light}30`
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="h3">
            {patientName}
          </Typography>
          <Chip
            label={`Queue #${queuePosition}`}
            color="primary"
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Chip 
            icon={<PriorityHighIcon />}
            label={`${riskLabel} Risk`}
            color={riskColor}
            size="small"
          />
          <Chip 
            icon={<AccessTimeIcon />}
            label={`Est. wait: ${formatWaitTime(estimatedWaitTime)}`}
            color="secondary"
            variant="outlined"
            size="small"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Check-in time: {checkInTime}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Age: {demographics.age || patient.age || 'N/A'} | 
          BP: {vitalSigns.systolic_bp || 'N/A'}/{vitalSigns.diastolic_bp || 'N/A'} mmHg |
          HR: {vitalSigns.heart_rate || 'N/A'} BPM
        </Typography>
        
        {patient.priority_score && (
          <Typography variant="body2" color="text.secondary">
            Priority Score: {parseFloat(patient.priority_score).toFixed(1)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default PatientQueueItem;