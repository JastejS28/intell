import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';

function PatientInfoPage() {
  const navigate = useNavigate();
  
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    gender: '1', // Default to male (1)
    weight: '',
    height: '',
    contactNumber: '',
    emergencyContact: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientInfo({
      ...patientInfo,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!patientInfo.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!patientInfo.age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(patientInfo.age) || patientInfo.age < 1 || patientInfo.age > 120) {
      newErrors.age = 'Please enter a valid age';
    }
    
    if (!patientInfo.weight) {
      newErrors.weight = 'Weight is required';
    } else if (isNaN(patientInfo.weight) || patientInfo.weight < 1 || patientInfo.weight > 500) {
      newErrors.weight = 'Please enter a valid weight';
    }
    
    if (!patientInfo.height) {
      newErrors.height = 'Height is required';
    } else if (isNaN(patientInfo.height) || patientInfo.height < 0.5 || patientInfo.height > 3) {
      newErrors.height = 'Please enter a valid height in meters (0.5 - 3)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Store in session storage to use in the next page
      sessionStorage.setItem('patientInfo', JSON.stringify(patientInfo));
      
      // Navigate to vital signs page
      navigate('/vital-signs');
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <PersonIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Patient Information
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please enter your basic information to start the check-in process
        </Typography>
      </Box>
      
      <Stepper activeStep={0} alternativeLabel sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Patient Info</StepLabel>
        </Step>
        <Step>
          <StepLabel>Vital Signs</StepLabel>
        </Step>
        <Step>
          <StepLabel>Queue Status</StepLabel>
        </Step>
      </Stepper>
      
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={patientInfo.name}
                  onChange={handleChange}
                  variant="outlined"
                  error={!!errors.name}
                  helperText={errors.name}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Age"
                  name="age"
                  type="number"
                  value={patientInfo.age}
                  onChange={handleChange}
                  variant="outlined"
                  inputProps={{ min: 1, max: 120 }}
                  error={!!errors.age}
                  helperText={errors.age}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Gender</FormLabel>
                  <RadioGroup
                    row
                    name="gender"
                    value={patientInfo.gender}
                    onChange={handleChange}
                  >
                    <FormControlLabel value="1" control={<Radio />} label="Male" />
                    <FormControlLabel value="0" control={<Radio />} label="Female" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  name="weight"
                  type="number"
                  value={patientInfo.weight}
                  onChange={handleChange}
                  variant="outlined"
                  inputProps={{ step: 0.1 }}
                  error={!!errors.weight}
                  helperText={errors.weight}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Height (m)"
                  name="height"
                  type="number"
                  value={patientInfo.height}
                  onChange={handleChange}
                  variant="outlined"
                  inputProps={{ step: 0.01 }}
                  error={!!errors.height}
                  helperText={errors.height || 'Enter height in meters (e.g., 1.75)'}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Number (Optional)"
                  name="contactNumber"
                  value={patientInfo.contactNumber}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Emergency Contact (Optional)"
                  name="emergencyContact"
                  value={patientInfo.emergencyContact}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
              >
                Next: Enter Vital Signs
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
      
      <Alert severity="info" sx={{ mt: 3 }}>
        Your information is used only for the check-in process and will not be stored permanently.
      </Alert>
    </Box>
  );
}

export default PatientInfoPage;
