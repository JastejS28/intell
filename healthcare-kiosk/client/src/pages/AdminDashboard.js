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
  TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
        
        // Get current queue
        const queueResponse = await apiService.getQueue();
        setQueue(queueResponse.data || []);
        
        // Get queue statistics
        const statsResponse = await apiService.getQueueStats();
        setQueueStats(statsResponse);
        
      } catch (err) {
        console.error('Error fetching queue data:', err);
        setError('There was an error retrieving the queue information.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [refreshKey, authenticated]);
  
  const handleRefresh = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };
  
  const handleRemovePatient = async (patientId) => {
    try {
      await apiService.removeFromQueue(patientId);
      handleRefresh();
    } catch (error) {
      console.error('Error removing patient:', error);
      setError('Failed to remove patient from queue');
    }
  };
  
  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to clear the entire queue?')) {
      try {
        await apiService.clearQueue();
        handleRefresh();
      } catch (error) {
        console.error('Error clearing queue:', error);
        setError('Failed to clear queue');
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
    switch (riskLevel.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'primary';
    }
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
  
  if (loading) {
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <QueueStats stats={queueStats} loading={false} />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearQueue}
            >
              Clear Queue
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
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Current Queue
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Position</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Risk Level</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Wait Time</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {queue.length > 0 ? (
                      queue.map((patient) => (
                        <TableRow key={patient.patientId}>
                          <TableCell>{patient.queuePosition}</TableCell>
                          <TableCell>{patient.name || `Patient #${patient.patientId.slice(-4)}`}</TableCell>
                          <TableCell>
                            <Chip 
                              label={patient.priorityInfo.risk_level} 
                              color={getRiskLevelColor(patient.priorityInfo.risk_level)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{patient.priorityInfo.priority_score.toFixed(1)}</TableCell>
                          <TableCell>{patient.priorityInfo.estimated_wait_time} min</TableCell>
                          <TableCell>
                            <IconButton 
                              aria-label="delete" 
                              color="error"
                              onClick={() => handleRemovePatient(patient.patientId)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No patients in queue
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
