import React from 'react';
import { Box, Typography, CircularProgress, Paper, Stack, Chip } from '@mui/material';

function QueueStats({ stats, loading }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" align="center" gutterBottom>
        Current Queue Status
      </Typography>
      
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">High Priority Patients:</Typography>
          <Chip 
            label={stats.highPriority || 0} 
            color="error" 
            size="small" 
            sx={{ minWidth: '60px', fontWeight: 'bold' }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">Medium Priority Patients:</Typography>
          <Chip 
            label={stats.mediumPriority || 0} 
            color="warning" 
            size="small"
            sx={{ minWidth: '60px', fontWeight: 'bold' }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">Low Priority Patients:</Typography>
          <Chip 
            label={stats.lowPriority || 0} 
            color="success" 
            size="small"
            sx={{ minWidth: '60px', fontWeight: 'bold' }}
          />
        </Box>
      </Stack>
      
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="body1" fontWeight="bold">
          Total Patients: {stats.totalPatients || 0}
        </Typography>
      </Box>
    </Paper>
  );
}

export default QueueStats;
