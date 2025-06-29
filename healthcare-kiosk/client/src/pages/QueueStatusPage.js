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
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  
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
      
      // Get current queue
      try {
        const queueResponse = await apiService.getQueue();
        console.log("Queue response received:", queueResponse);
        
        if (queueResponse && queueResponse.data) {
          setQueue(queueResponse.data);
          console.log("Queue data set:", queueResponse.data);

          // Find this patient in the current queue and update their info
          const patientInQueue = queueResponse.data.find(p => {
            const patientId = initialAssessment.id || initialAssessment.patientId;
            return p.id === patientId || p.patientId === patientId;
          });
          
          if (patientInQueue) {
            console.log('Found patient in queue, updating assessment:', patientInQueue);
            
            // Update assessment with current queue information
            const updatedAssessment = {
              ...initialAssessment,
              // Update queue position
              queue_position: patientInQueue.queue_position,
              queuePosition: patientInQueue.queue_position,
              // Update wait time
              estimated_wait_time: patientInQueue.estimated_wait_time,
              // Update priority info
              priority_score: patientInQueue.priority_score,
              risk_level: patientInQueue.risk_level,
              // Update priorityInfo object for compatibility
              priorityInfo: {
                ...initialAssessment.priorityInfo,
                estimated_wait_time: patientInQueue.estimated_wait_time,
                queue_position: patientInQueue.queue_position,
                priority_score: patientInQueue.priority_score,
                risk_level: patientInQueue.risk_level
              },
              // Update timestamp
              lastUpdated: new Date().toISOString()
            };
            
            setAssessment(updatedAssessment);
            sessionStorage.setItem('patientAssessment', JSON.stringify(updatedAssessment));
            console.log('Assessment updated with current queue data');
          } else {
            console.log('Patient not found in current queue - they may have been called or removed');
            // Keep the stored assessment but mark as potentially outdated
            setAssessment({
              ...initialAssessment,
              queueStatus: 'not_found',
              lastUpdated: new Date().toISOString()
            });
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
        setError('Unable to fetch current queue. Showing your stored information.');
      }
      
      // Get queue statistics
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
      
      setLastUpdateTime(new Date());
      
    } catch (err) {
      console.error('Error in main fetchData function:', err);
      setError('There was an error retrieving the queue information. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  
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
  
  // Get risk level with proper fallbacks
  const riskLevel = patientAssessment?.risk_level || 
                   patientAssessment?.priorityInfo?.risk_level || 'Unknown';
  const riskColor = getRiskLevelColor(riskLevel);
  
  // Get queue position with proper fallbacks
  const queuePosition = patientAssessment?.queue_position || 
                       patientAssessment?.queuePosition || 
                       (patientAssessment?.priorityInfo && patientAssessment.priorityInfo.queue_position) || 
                       '?';
  
  // Get priority score with proper fallbacks
  const priorityScore = patientAssessment?.priority_score || 
                       (patientAssessment?.priorityInfo && patientAssessment.priorityInfo.priority_score) || 
                       0;
  
  // Get estimated wait time with proper fallbacks
  const estimatedWaitTime = patientAssessment?.estimated_wait_time ||
                           (patientAssessment?.priorityInfo && patientAssessment.priorityInfo.estimated_wait_time) ||
                           30; // Default fallback
  
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
      
      {patientAssessment.queueStatus === 'not_found' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You may have been called or your queue position has changed. Please check with staff or refresh for updates.
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
                      #{queuePosition}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Estimated Wait Time
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatQueueTime(estimatedWaitTime)}
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
                      secondary={parseFloat(priorityScore).toFixed(2)} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Check-in Time" 
                      secondary={moment(patientAssessment.checkInTime || patientAssessment.check_in_time || new Date()).format('MMM D, YYYY hh:mm A')} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Last Updated" 
                      secondary={moment(lastUpdateTime).format('hh:mm:ss A')} 
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
        High priority patients may be seen sooner than their estimated wait times. Last updated: {moment(lastUpdateTime).format('hh:mm:ss A')}
      </Alert>
    </Box>
  );
}

export default QueueStatusPage;