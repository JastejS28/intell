import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Slider,
  InputAdornment,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VitalSignsDisplay from '../components/VitalSignsDisplay';
import apiService from '../utils/api';

function VitalSignsPage() {
  const navigate = useNavigate();
  
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [vitalSigns, setVitalSigns] = useState({
    heartRate: 75,
    respiratoryRate: 16,
    bodyTemperature: 36.6,
    oxygenSaturation: 98,
    systolicBP: 120,
    diastolicBP: 80
  });
  
  useEffect(() => {
    // Get patient info from session storage
    const storedInfo = sessionStorage.getItem('patientInfo');
    if (!storedInfo) {
      // Redirect to patient info page if no data
      navigate('/patient-info');
      return;
    }
    
    setPatientInfo(JSON.parse(storedInfo));
    
    // Simulate loading vital signs from a device
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  const handleVitalChange = (name) => (event, newValue) => {
    // For sliders
    if (newValue !== undefined) {
      setVitalSigns({
        ...vitalSigns,
        [name]: newValue
      });
    } 
    // For text inputs
    else {
      const value = event.target.value === '' ? '' : Number(event.target.value);
      setVitalSigns({
        ...vitalSigns,
        [name]: value
      });
    }
  };
  
  const handleTextFieldChange = (name) => (event) => {
    setVitalSigns({
      ...vitalSigns,
      [name]: Number(event.target.value)
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!patientInfo) {
      setError('Patient information is missing. Please go back and fill in your information.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Combine patient info with vital signs
      const patientData = {
        ...patientInfo,
        ...vitalSigns
      };
      
      // Submit to API
      const response = await apiService.submitVitals(patientData);
      
      // Store the response in session storage
      sessionStorage.setItem('patientAssessment', JSON.stringify(response.data));
      
      // Navigate to queue status page
      navigate('/queue-status');
      
    } catch (err) {
      console.error('Error submitting vital signs:', err);
      setError('There was an error submitting your information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Measuring vital signs...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <FavoriteIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Vital Signs Measurement
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please enter your vital signs readings or use the connected medical devices
        </Typography>
      </Box>
      
      <Stepper activeStep={1} alternativeLabel sx={{ mb: 4 }}>
        <Step completed>
          <StepLabel>Patient Info</StepLabel>
        </Step>
        <Step>
          <StepLabel>Vital Signs</StepLabel>
        </Step>
        <Step>
          <StepLabel>Queue Status</StepLabel>
        </Step>
      </Stepper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enter Your Vital Signs
              </Typography>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Heart Rate */}
                  <Grid item xs={12}>
                    <Typography id="heart-rate-slider" gutterBottom>
                      Heart Rate (BPM)
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs>
                        <Slider
                          value={vitalSigns.heartRate}
                          onChange={handleVitalChange('heartRate')}
                          aria-labelledby="heart-rate-slider"
                          min={40}
                          max={180}
                          marks={[
                            { value: 40, label: '40' },
                            { value: 70, label: '70' },
                            { value: 100, label: '100' },
                            { value: 140, label: '140' },
                            { value: 180, label: '180' }
                          ]}
                        />
                      </Grid>
                      <Grid item>
                        <TextField
                          value={vitalSigns.heartRate}
                          onChange={handleTextFieldChange('heartRate')}
                          inputProps={{
                            step: 1,
                            min: 40,
                            max: 180,
                            type: 'number',
                          }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">BPM</InputAdornment>,
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  
                  {/* Blood Pressure */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Systolic Blood Pressure
                    </Typography>
                    <TextField
                      fullWidth
                      value={vitalSigns.systolicBP}
                      onChange={(e) => setVitalSigns({...vitalSigns, systolicBP: Number(e.target.value)})}
                      inputProps={{
                        step: 1,
                        min: 70,
                        max: 200,
                        type: 'number',
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Diastolic Blood Pressure
                    </Typography>
                    <TextField
                      fullWidth
                      value={vitalSigns.diastolicBP}
                      onChange={(e) => setVitalSigns({...vitalSigns, diastolicBP: Number(e.target.value)})}
                      inputProps={{
                        step: 1,
                        min: 40,
                        max: 120,
                        type: 'number',
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  {/* Body Temperature */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Body Temperature
                    </Typography>
                    <TextField
                      fullWidth
                      value={vitalSigns.bodyTemperature}
                      onChange={(e) => setVitalSigns({...vitalSigns, bodyTemperature: Number(e.target.value)})}
                      inputProps={{
                        step: 0.1,
                        min: 35,
                        max: 42,
                        type: 'number',
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  {/* Oxygen Saturation */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Oxygen Saturation
                    </Typography>
                    <TextField
                      fullWidth
                      value={vitalSigns.oxygenSaturation}
                      onChange={(e) => setVitalSigns({...vitalSigns, oxygenSaturation: Number(e.target.value)})}
                      inputProps={{
                        step: 1,
                        min: 70,
                        max: 100,
                        type: 'number',
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  {/* Respiratory Rate */}
                  <Grid item xs={12}>
                    <Typography gutterBottom>
                      Respiratory Rate
                    </Typography>
                    <TextField
                      fullWidth
                      value={vitalSigns.respiratoryRate}
                      onChange={(e) => setVitalSigns({...vitalSigns, respiratoryRate: Number(e.target.value)})}
                      inputProps={{
                        step: 1,
                        min: 8,
                        max: 40,
                        type: 'number',
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">breaths/min</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/patient-info')}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={submitting}
                  >
                    {submitting ? <CircularProgress size={24} /> : 'Submit and Check Queue'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <VitalSignsDisplay vitals={vitalSigns} />
          
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> In a real kiosk, these values would be automatically measured 
              using connected medical devices such as a blood pressure monitor, thermometer, 
              pulse oximeter, and scale.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default VitalSignsPage;
