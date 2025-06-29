import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import QueueStats from '../components/QueueStats';
import PatientQueueItem from '../components/PatientQueueItem';
import apiService from '../utils/api';
import moment from 'moment';

function QueueStatusPage() {
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({
    totalPatients: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get patient assessment from session storage
      const storedAssessment = sessionStorage.getItem('patientAssessment');
      if (!storedAssessment) {
        navigate('/vital-signs');
        return;
      }
      
      const initialAssessment = JSON.parse(storedAssessment);
      
      // Get current queue - with better error handling
      try {
        const queueResponse = await apiService.getQueue();
        if (queueResponse && queueResponse.data) {
          setQueue(queueResponse.data);
          console.log("Queue data received:", queueResponse.data);

          // Update the patient's position and wait time from the new queue data
          const patientInQueue = queueResponse.data.find(p => p.id === initialAssessment.id);
          if (patientInQueue) {
            const updatedAssessment = {
              ...initialAssessment,
              queue_position: patientInQueue.queue_position,
              estimated_wait_time: patientInQueue.estimated_wait_time,
            };
            setAssessment(updatedAssessment);
            sessionStorage.setItem('patientAssessment', JSON.stringify(updatedAssessment));
          } else {
              setAssessment(initialAssessment);
          }

        } else {
          console.warn("Empty queue data received");
          setQueue([]);
          setAssessment(initialAssessment);
        }
      } catch (queueErr) {
        console.error("Queue fetch failed:", queueErr);
        setQueue([]);
        setAssessment(initialAssessment);
      }
      
      // Get queue statistics with better error handling
      try {
        const statsResponse = await apiService.getQueueStats();
        setQueueStats(statsResponse);
      } catch (statsErr) {
        console.error("Stats fetch failed:", statsErr);
      }
      
    } catch (err) {
      console.error('Error in main fetchData function:', err);
      setError('There was an error retrieving the queue information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  
  useEffect(() => {
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchData]);
  
  const handleRefresh = () => {
    setLoading(true);
    fetchData().catch(err => {
      console.error("Error during manual refresh:", err);
      setLoading(false);
    });
  };
  
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'primary';
    }
  };
  
  // Update the formatQueueTime function to avoid hardcoded fallbacks
  const formatQueueTime = (minutes) => {
    if (!minutes || isNaN(minutes)) {
      return "Calculating..."; // Better to show this than a hardcoded time
    }
    
    minutes = parseInt(minutes);
    
    if (minutes === 0) {
      return "Next in line";
    } else if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
    }
  };
  
  // Helper function to update patient data with fresh queue data
  const updatePatientFromQueue = (patientData, queueData) => {
    if (!queueData || queueData.length === 0 || !patientData) return patientData;
    
    // Find this patient in the queue
    const matchingPatient = queueData.find(p => p.patientId === patientData.patientId);
    
    if (matchingPatient) {
      console.log('Found matching patient in queue, updating assessment data');
      return matchingPatient;
    }
    
    return patientData;
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading queue status...
        </Typography>
      </Box>
    );
  }
  
  if (!assessment) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="warning">
          No patient assessment found. Please complete the vital signs measurement first.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/patient-info')}
          sx={{ mt: 2 }}
        >
          Start Check-In Process
        </Button>
      </Box>
    );
  }
  
  const patientAssessment = assessment;
  
  // Add safety check for priorityInfo before accessing risk_level
  const riskLevel = patientAssessment?.priorityInfo?.risk_level || 'Unknown';
  const riskColor = getRiskLevelColor(riskLevel);
  
  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <PeopleAltIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Queue Status
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your information has been processed and you have been added to the queue
        </Typography>
      </Box>
      
      <Stepper activeStep={2} alternativeLabel sx={{ mb: 4 }}>
        <Step completed>
          <StepLabel>Patient Info</StepLabel>
        </Step>
        <Step completed>
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
      
      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Your Assessment
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Patient: {patientAssessment.name}
                </Typography>
                <Chip
                  icon={<PriorityHighIcon />}
                  label={`${riskLevel} Priority`}
                  color={riskColor}
                />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Queue Position
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      #{patientAssessment.queuePosition || (patientAssessment.priorityInfo && patientAssessment.priorityInfo.queue_position) || 1}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Estimated Wait Time
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatQueueTime(
                        patientAssessment.priorityInfo && typeof patientAssessment.priorityInfo.estimated_wait_time !== 'undefined' 
                          ? patientAssessment.priorityInfo.estimated_wait_time 
                          : patientAssessment.priorityInfo && patientAssessment.priorityInfo.risk_level === 'Low' 
                            ? 60 
                            : patientAssessment.priorityInfo && patientAssessment.priorityInfo.risk_level === 'Medium' 
                              ? 30 
                              : 15
                      )}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Priority Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Risk Level" 
                      secondary={riskLevel} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Priority Score" 
                      secondary={(patientAssessment.priorityInfo?.priority_score || 0).toFixed(2)} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Check-in Time" 
                      secondary={moment(patientAssessment.checkInTime).format('MMM D, YYYY hh:mm A')} 
                    />
                  </ListItem>
                </List>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <AccessTimeIcon color="primary" />
                <Typography variant="body1">
                  Please watch the display for your name or queue number
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/')}
                  size="large"
                >
                  Complete Check-In
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <Stack spacing={3}>
            <QueueStats stats={queueStats} loading={loading} />
            
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Queue
                </Typography>
                
                {queue.length > 0 ? (
                  queue.slice(0, 5).map((patient, index) => (
                    <PatientQueueItem 
                      key={patient.patientId} 
                      patient={patient} 
                      position={index + 1} 
                    />
                  ))
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                    No other patients in queue
                  </Typography>
                )}
                
                {queue.length > 5 && (
                  <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
                    ... and {queue.length - 5} more patients
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
      
      <Alert severity="info" sx={{ mt: 4 }}>
        The queue priority is dynamically updated based on patient risk levels, wait times, and available resources.
        High priority patients may be seen sooner than their estimated wait times.
      </Alert>
    </Box>
  );
}

export default QueueStatusPage;


