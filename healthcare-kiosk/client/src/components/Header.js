import React from 'react';
import { AppBar, Toolbar, Typography, Box, useMediaQuery } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useTheme } from '@mui/material/styles';

function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <LocalHospitalIcon 
          sx={{ 
            mr: 2,
            fontSize: isMobile ? 24 : 32 
          }} 
        />
        <Box>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            component="h1" 
            sx={{ fontWeight: 'bold' }}
          >
            HealthCare Kiosk
          </Typography>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              display: { xs: 'none', sm: 'block' },
              fontStyle: 'italic'
            }}
          >
            Intelligent Patient Priority System
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
