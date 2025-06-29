import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';

// Helper function to determine color based on value
const getColorForValue = (value, type) => {
  // Different ranges for different vital sign types
  switch (type) {
    case 'heart_rate':
      if (value < 60) return 'warning';
      if (value > 100) return 'error';
      return 'success';
    
    case 'blood_pressure_sys':
      if (value < 90) return 'warning';
      if (value > 140) return 'error';
      return 'success';
    
    case 'blood_pressure_dia':
      if (value < 60) return 'warning';
      if (value > 90) return 'error';
      return 'success';
    
    case 'oxygen':
      if (value < 92) return 'error';
      if (value < 95) return 'warning';
      return 'success';
    
    case 'temperature':
      if (value < 36.1) return 'warning';
      if (value > 37.8) return 'error';
      return 'success';
    
    case 'respiratory_rate':
      if (value < 12) return 'warning';
      if (value > 20) return 'error';
      return 'success';
    
    default:
      return 'primary';
  }
};

// Helper function to calculate the progress percentage
const calculateProgress = (value, min, max) => {
  // Calculate percentage within range
  const percentage = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
};

function VitalSignsDisplay({ vitals }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Vital Signs Summary
        </Typography>
        
        {/* Heart Rate */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Heart Rate</Typography>
            <Typography 
              variant="body2" 
              color={`${getColorForValue(vitals.heartRate, 'heart_rate')}.main`}
              fontWeight="bold"
            >
              {vitals.heartRate} BPM
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress(vitals.heartRate, 40, 120)} 
            color={getColorForValue(vitals.heartRate, 'heart_rate')}
            sx={{ height: 8, borderRadius: 2 }}
          />
        </Box>
        
        {/* Blood Pressure */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Blood Pressure</Typography>
            <Typography 
              variant="body2" 
              fontWeight="bold"
            >
              <span style={{ color: '#f44336' }}>{vitals.systolicBP}</span>/
              <span style={{ color: '#2196f3' }}>{vitals.diastolicBP}</span> mmHg
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <LinearProgress 
              variant="determinate" 
              value={calculateProgress(vitals.systolicBP, 80, 180)} 
              color={getColorForValue(vitals.systolicBP, 'blood_pressure_sys')}
              sx={{ height: 8, borderRadius: 2, flexGrow: 1 }}
            />
            <Typography variant="caption" sx={{ minWidth: '20px', textAlign: 'center' }}>/</Typography>
            <LinearProgress 
              variant="determinate" 
              value={calculateProgress(vitals.diastolicBP, 50, 120)} 
              color={getColorForValue(vitals.diastolicBP, 'blood_pressure_dia')}
              sx={{ height: 8, borderRadius: 2, flexGrow: 1 }}
            />
          </Box>
        </Box>
        
        {/* Oxygen Saturation */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Oxygen Saturation</Typography>
            <Typography 
              variant="body2" 
              color={`${getColorForValue(vitals.oxygenSaturation, 'oxygen')}.main`}
              fontWeight="bold"
            >
              {vitals.oxygenSaturation}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress(vitals.oxygenSaturation, 85, 100)} 
            color={getColorForValue(vitals.oxygenSaturation, 'oxygen')}
            sx={{ height: 8, borderRadius: 2 }}
          />
        </Box>
        
        {/* Temperature */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Body Temperature</Typography>
            <Typography 
              variant="body2" 
              color={`${getColorForValue(vitals.bodyTemperature, 'temperature')}.main`}
              fontWeight="bold"
            >
              {vitals.bodyTemperature}°C
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress(vitals.bodyTemperature, 35, 40)} 
            color={getColorForValue(vitals.bodyTemperature, 'temperature')}
            sx={{ height: 8, borderRadius: 2 }}
          />
        </Box>
        
        {/* Respiratory Rate */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Respiratory Rate</Typography>
            <Typography 
              variant="body2" 
              color={`${getColorForValue(vitals.respiratoryRate, 'respiratory_rate')}.main`}
              fontWeight="bold"
            >
              {vitals.respiratoryRate} breaths/min
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress(vitals.respiratoryRate, 8, 30)} 
            color={getColorForValue(vitals.respiratoryRate, 'respiratory_rate')}
            sx={{ height: 8, borderRadius: 2 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

export default VitalSignsDisplay;
