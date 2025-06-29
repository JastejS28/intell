import React from 'react';
import { Box, Typography, Link } from '@mui/material';

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <Box 
      component="footer" 
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[100],
        borderTop: '1px solid',
        borderColor: (theme) => theme.palette.grey[300],
      }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        {'© '}
        {currentYear}
        {' '}
        <Link color="inherit" href="#">
          Healthcare Kiosk System
        </Link>{' '}
        | Powered by Intel Technology
      </Typography>
    </Box>
  );
}

export default Footer;
