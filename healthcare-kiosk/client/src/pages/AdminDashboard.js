import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CallIcon from '@mui/icons-material/Call';
import apiService from '../utils/api';
import QueueStats from '../components/QueueStats';

function AdminDashboard() {
  const [queue, setQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({
    totalPatients: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // In a real app, this would be authenticated via backend
  const adminPassword = 'admin123';
  
  useEffect(() => {
    // Check if already authenticated in session storage
    const isAuth = sessionStorage.getItem('adminAuth');
    if (isAuth === 'true') {
      setAuthenticated(true);
    } else {
      setDialogOpen(true);
    }
  }, []);
  
  useEffect(() => {
    if (!authenticated) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Admin Dashboard: Fetching queue data...');
        
        // Get current queue
        const queueResponse = await apiService.getQueue();
        console.log('Admin Dashboard: Queue response:', queueResponse);
        
        if (queueResponse && queueResponse.data) {
          setQueue(queueResponse.data);
          console.log('Admin Dashboard: Queue set to:', queueResponse.data);
        } else {
          console.warn('Admin Dashboard: No queue data received');
          setQueue([]);
        }
        
        // Get queue statistics
        const statsResponse = await apiService.getQueueStats();
        console.log('Admin Dashboard: Stats response:', statsResponse);
        setQueueStats(statsResponse);
        
      } catch (err) {
        console.error('Admin Dashboard: Error fetching queue data:', err);
        setError('There was an error retrieving the queue information.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [refreshKey, authenticated]);
  
  const handleRefresh = async () => {
    console.log('Admin Dashboard: Manual refresh triggered');
    setRefreshKey(oldKey => oldKey + 1);
  };
  
  const handleRemovePatient = async (patientId) => {
    try {
      setActionLoading(true);
      console.log('Admin Dashboard: Removing patient:', patientId);
      
      const response = await apiService.removeFromQueue(patientId);
      console.log('Admin Dashboard: Remove response:', response);
      
      setSuccessMessage('Patient removed from queue successfully');
      
      // Force immediate refresh
      await handleRefresh();
      
    } catch (error) {
      console.error('Admin Dashboard: Error removing patient:', error);
      setError('Failed to remove patient from queue');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleCallNextPatient = async () => {
    try {
      setActionLoading(true);
      setError(null);
      console.log('Admin Dashboard: Calling next patient...');
      
      const response = await apiService.callNextPatient();
      console.log('Admin Dashboard: Next patient response:', response);
      
      if (response && response.success) {
        if (response.nextPatient) {
          const patientName = response.nextPatient.name || `Patient ${(response.nextPatient.patientId || response.nextPatient.patient_id || '').slice(-4)}`;
          const riskLevel = response.nextPatient.risk_level || 'Unknown';
          setSuccessMessage(`✅ Called: ${patientName} (${riskLevel} priority)`);
        } else {
          setSuccessMessage('ℹ️ No patients in queue');
        }
        
        // Force immediate refresh to show updated queue
        await handleRefresh();
      } else {
        setError('Failed to call next patient - invalid response');
      }
      
    } catch (error) {
      console.error('Admin Dashboard: Error calling next patient:', error);
      setError(`Failed to call next patient: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to clear the entire queue?')) {
      try {
        setActionLoading(true);
        console.log('Admin Dashboard: Clearing queue...');
        
        const response = await apiService.clearQueue();
        console.log('Admin Dashboard: Clear response:', response);
        
        setSuccessMessage(`Cleared ${response.clearedCount || 0} patients from queue`);
        
        // Force immediate refresh
        await handleRefresh();
        
      } catch (error) {
        console.error('Admin Dashboard: Error clearing queue:', error);
        setError('Failed to clear queue');
      } finally {
        setActionLoading(false);
      }
    }
  };
  
  const handlePasswordSubmit = () => {
    if (password === adminPassword) {
      setAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      setDialogOpen(false);
    } else {
      alert('Incorrect password');
    }
  };
  
  const getRiskLevelColor = (riskLevel) => {
    const level = (riskLevel || '').toLowerCase();
    if (level.includes('high')) return 'error';
    if (level.includes('medium')) return 'warning';
    if (level.includes('low')) return 'success';
    return 'primary';
  };
  
  if (!authenticated) {
    return (
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Administrator Login</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.location.href = '/'}>Cancel</Button>
          <Button onClick={handlePasswordSubmit}>Login</Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  if (loading && queue.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading queue data...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Administrator Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage patient queue and monitor system status
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <QueueStats stats={queueStats} loading={loading} />
          
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              fullWidth
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Queue'}
            </Button>
            
            <Button
              variant="contained"
              color="success"
              startIcon={<CallIcon />}
              onClick={handleCallNextPatient}
              fullWidth
              disabled={queue.length === 0 || actionLoading}
              size="large"
            >
              {actionLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Calling...
                </>
              ) : (
                'Call Next Patient'
              )}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearQueue}
              fullWidth
              disabled={queue.length === 0 || actionLoading}
            >
              {actionLoading ? 'Clearing...' : 'Clear Queue'}
            </Button>
          </Box>
          
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Admin Controls
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => window.location.href = '/patient-info'}
                sx={{ mb: 2 }}
              >
                Add Test Patient
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                Current queue length: {queue.length} patients
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  Current Queue ({queue.length} patients)
                </Typography>
                {loading && (
                  <CircularProgress size={20} />
                )}
              </Box>
              
              {queue.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Position</strong></TableCell>
                        <TableCell><strong>Patient</strong></TableCell>
                        <TableCell><strong>Risk Level</strong></TableCell>
                        <TableCell><strong>Priority</strong></TableCell>
                        <TableCell><strong>Wait Time</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queue.map((patient, index) => {
                        const patientName = patient.name || `Patient #${(patient.id || patient.patientId || '').slice(-4)}`;
                        const riskLevel = patient.risk_level || patient.priorityInfo?.risk_level || 'Unknown';
                        const priorityScore = patient.priority_score || patient.priorityInfo?.priority_score || 0;
                        const waitTime = patient.estimated_wait_time || patient.priorityInfo?.estimated_wait_time || 0;
                        const patientId = patient.id || patient.patientId;
                        const position = patient.queue_position || patient.queuePosition || (index + 1);
                        
                        return (
                          <TableRow 
                            key={patientId || index}
                            sx={{ 
                              backgroundColor: position === 1 ? 'action.hover' : 'inherit',
                              '&:hover': { backgroundColor: 'action.selected' }
                            }}
                          >
                            <TableCell>
                              <Typography 
                                variant="h6" 
                                color={position === 1 ? 'success.main' : 'primary.main'}
                                fontWeight="bold"
                              >
                                #{position}
                                {position === 1 && ' 👑'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="subtitle1" fontWeight={position === 1 ? 'bold' : 'normal'}>
                                {patientName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={riskLevel} 
                                color={getRiskLevelColor(riskLevel)}
                                size="small"
                                variant={position === 1 ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {parseFloat(priorityScore).toFixed(1)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {waitTime} min
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                aria-label="delete" 
                                color="error"
                                onClick={() => handleRemovePatient(patientId)}
                                disabled={actionLoading}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No patients in queue
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Patients will appear here after completing the check-in process
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;