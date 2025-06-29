import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  Paper 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import TimelineIcon from '@mui/icons-material/Timeline';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';

function LandingPage() {
  const navigate = useNavigate();
  
  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <LocalHospitalIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Healthcare Kiosk
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Intel-powered healthcare kiosk with intelligent patient queue management
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          color="primary" 
          onClick={() => navigate('/patient-info')}
          sx={{ mt: 2 }}
        >
          Start Patient Check-In
        </Button>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            <AssignmentIndIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Quick Registration
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Fast and easy patient registration with minimal information required
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            <HealthAndSafetyIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Vital Signs Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Accurately measure and record vital signs for priority assessment
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            <TimelineIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Intelligent Queue
            </Typography>
            <Typography variant="body1" color="text.secondary">
              AI-powered queue management based on health risk priority
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Card sx={{ mt: 6 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            About This System
          </Typography>
          <Typography variant="body1" paragraph>
            The Healthcare Kiosk is an interactive device designed to streamline patient intake and queue management in hospitals and Ayushman Arogya Mandirs. It uses advanced Intel technology and machine learning algorithms to prioritize patients based on their vital signs and medical urgency.
          </Typography>
          <Typography variant="body1">
            By collecting vital signs such as blood pressure, heart rate, temperature, and oxygen saturation, the system can intelligently assign priority scores to patients, ensuring that those with more critical needs are seen first, while optimizing overall wait times.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LandingPage;
