import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000 // 15 second timeout for external API calls
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
  console.log('API Request:', request.method?.toUpperCase(), request.url, request.data);
  return request;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  error => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const apiService = {
  // Patient endpoints
  submitPatientInfo: (data) => api.post('/patients', data),
  
  submitVitals: async (data) => {
    try {
      console.log('Submitting vitals:', data);
      const response = await api.post('/patients/vitals', data);
      return response;
    } catch (error) {
      console.error('Error submitting vitals:', error);
      throw error;
    }
  },
  
  // Queue endpoints
  getQueue: async () => {
    try {
      console.log('Fetching queue...');
      const response = await api.get('/queue');
      console.log('Queue response:', response.data);
      
      // Ensure we return the expected format
      if (response.data && response.data.success) {
        return {
          data: response.data.data || [],
          count: response.data.count || 0
        };
      }
      
      // Fallback format
      return {
        data: Array.isArray(response.data) ? response.data : [],
        count: Array.isArray(response.data) ? response.data.length : 0
      };
    } catch (error) {
      console.error("Error fetching queue:", error);
      // Return empty data instead of throwing
      return { 
        data: [],
        count: 0,
        error: error.message
      };
    }
  },
  
  // Calculate stats from queue data since /stats endpoint doesn't exist
  getQueueStats: async () => {
    try {
      const queueResponse = await apiService.getQueue();
      const queueData = queueResponse.data || [];
      
      console.log('Calculating stats from queue data:', queueData);
      
      // Calculate stats from the queue data
      const stats = {
        totalPatients: queueData.length,
        highPriority: queueData.filter(p => {
          const riskLevel = (p.risk_level || p.priorityInfo?.risk_level || '').toLowerCase();
          return riskLevel === 'high' || riskLevel === 'high risk';
        }).length,
        mediumPriority: queueData.filter(p => {
          const riskLevel = (p.risk_level || p.priorityInfo?.risk_level || '').toLowerCase();
          return riskLevel === 'medium' || riskLevel === 'medium risk';
        }).length,
        lowPriority: queueData.filter(p => {
          const riskLevel = (p.risk_level || p.priorityInfo?.risk_level || '').toLowerCase();
          return riskLevel === 'low' || riskLevel === 'low risk';
        }).length
      };
      
      console.log('Calculated stats:', stats);
      return stats;
    } catch (error) {
      console.error("Error calculating queue stats:", error);
      return {
        totalPatients: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0
      };
    }
  },
  
  // Remove patient from queue
  removeFromQueue: async (patientId) => {
    try {
      console.log('Removing patient from queue:', patientId);
      const response = await api.delete(`/queue/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing patient:', error);
      throw error;
    }
  },
  
  // Clear entire queue
  clearQueue: async () => {
    try {
      console.log('Clearing entire queue...');
      const response = await api.delete('/queue');
      return response.data;
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
  },
  
  // Admin endpoint for calling next patient
  callNextPatient: async () => {
    try {
      console.log('Calling next patient...');
      const response = await api.delete('/queue/next');
      return response.data;
    } catch (error) {
      console.error('Error calling next patient:', error);
      
      // Handle specific error cases
      if (error.response && error.response.status === 404) {
        // No patients in queue
        return {
          success: true,
          nextPatient: null,
          updatedQueue: [],
          message: 'No patients in queue',
          removedCount: 0
        };
      }
      
      throw error;
    }
  },
  
  // Health check endpoint
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
};

export default apiService;