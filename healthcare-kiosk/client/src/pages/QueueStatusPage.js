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
import RefreshIcon from '@mui/icons-material/Refresh';
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
      setError(null);
      
      // Get patient assessment from session storage
      const storedAssessment = sessionStorage.getItem('patientAssessment');
      if (!storedAssessment) {
        console.warn('No patient assessment found in session storage');
        navigate('/vital-signs');
        return;
      }
      
      const initialAssessment = JSON.parse(storedAssessment);
      console.log('Loaded assessment from session:', initialAssessment);
      
      // Get current queue - with better error handling
      try {
        const queueResponse = await apiService.getQueue();
        console.log("Queue response received:", queueResponse);
        
        if (queueResponse && queueResponse.data) {
          setQueue(queueResponse.data);
          console.log("Queue data set:", queueResponse.data);

          // Update the patient's position and wait time from the new queue data
          const patientInQueue = queueResponse.data.find(p => 
            p.id === initialAssessment.id || 
            p.patientId === initialAssessment.patientId ||
            p.id === initialAssessment.patientId
          );
          
          if (patientInQueue) {
            console.log('Found patient in queue:', patientInQueue);
            const updatedAssessment = {
              ...initialAssessment,
              queue_position: patientInQueue.queue_position,
              estimated_wait_time: patientInQueue.estimated_wait_time,
              queuePosition: patientInQueue.queue_position || patientInQueue.queuePosition,
              priorityInfo: {
                ...initialAssessment.priorityInfo,
                estimated_wait_time: patientInQueue.estimated_wait_time,
                queue_position: patientInQueue.queue_position
              }
            };
            setAssessment(updatedAssessment);
            sessionStorage.setItem('patientAssessment', JSON.stringify(updatedAssessment));
          } else {
            console.log('Patient not found in queue, using stored assessment');
            setAssessment(initialAssessment);
          }
        } else {
          console.warn("Empty or invalid queue data received");
          setQueue([]);
          setAssessment(initialAssessment);
        }
      } catch (queueErr) {
        console.error("Queue fetch failed:", queueErr);
        setQueue([]);
        setAssessment(initialAssessment);
        setError('Unable to fetch current queue. Showing your information only.');
      }
      
      // Get queue statistics with better error handling
      try {
        const statsResponse = await apiService.getQueueStats();
        console.log("Stats response:", statsResponse);
        setQueueStats(statsResponse);
      } catch (statsErr) {
        console.error("Stats fetch failed:", statsErr);
        // Calculate basic stats from current queue if available
        if (queue.length > 0) {
          const basicStats = {
            totalPatients: queue.length,
            highPriority: queue.filter(p => (p.risk_level || '').toLowerCase().includes('high')).length,
            mediumPriority: queue.filter(p => (p.risk_level || '').toLowerCase().includes('medium')).length,
            lowPriority: queue.filter(p => (p.risk_level || '').toLowerCase().includes('low')).length
          };
          setQueueStats(basicStats);
        }
      }
      
    } catch (err) {
      console.error('Error in main fetchData function:', err);
      setError('There was an error retrieving the queue information. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [navigate, queue.length]);
  
  useEffect(() => {
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds

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
    const level = (riskLevel || '').toLowerCase();
    if (level.includes('high')) return 'error';
    if (level.includes('medium')) return 'warning';
    if (level.includes('low')) return 'success';
    return 'primary';
  };
  
  const formatQueueTime = (minutes) => {
    if (!minutes || isNaN(minutes)) {
      return "Calculating...";
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
  const riskLevel = patientAssessment?.priorityInfo?.risk_level || 
                   patientAssessment?.risk_level || 'Unknown';
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
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            sx={{ ml: 2 }}
            size="small"
          >
            Retry
          </Button>
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
                  Patient: {patientAssessment.name || 'Unknown'}
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
                      #{patientAssessment.queuePosition || 
                         patientAssessment.queue_position || 
                         (patientAssessment.priorityInfo && patientAssessment.priorityInfo.queue_position) || 
                         '?'}
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
                        patientAssessment.estimated_wait_time ||
                        (patientAssessment.priorityInfo && patientAssessment.priorityInfo.estimated_wait_time) ||
                        30 // Default fallback
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
                      secondary={(patientAssessment.priorityInfo?.priority_score || 
                                 patientAssessment.priority_score || 0).toFixed(2)} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Check-in Time" 
                      secondary={moment(patientAssessment.checkInTime || patientAssessment.check_in_time || new Date()).format('MMM D, YYYY hh:mm A')} 
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
              
              <Box sx={{ mt: 3, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  Refresh Status
                </Button>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Current Queue ({queue.length} patients)
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </Box>
                
                {queue.length > 0 ? (
                  queue.slice(0, 5).map((patient, index) => (
                    <PatientQueueItem 
                      key={patient.patientId || patient.id || index} 
                      patient={patient} 
                      position={index + 1} 
                    />
                  ))
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                    {loading ? 'Loading queue...' : 'No patients in queue'}
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