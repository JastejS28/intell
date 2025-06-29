// import axios from 'axios';

// // Create an axios instance
// const api = axios.create({
//   baseURL: '/api'
// });

// // API functions for interacting with the backend
// export const apiService = {
//   // Submit patient vitals and get priority assignment
//   submitVitals: async (patientData) => {
//     try {
//       const response = await api.post('/patients/vitals', patientData);
//       return response.data;
//     } catch (error) {
//       console.error('Error submitting vitals:', error);
//       throw error;
//     }
//   },
  
//   // Get the current queue of patients
//   getQueue: async () => {
//     try {
//       const response = await api.get('/queue');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching queue:', error);
//       throw error;
//     }
//   },
  
//   // Get queue statistics
//   getQueueStats: async () => {
//     try {
//       const response = await api.get('/queue/stats');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching queue stats:', error);
//       throw error;
//     }
//   },
  
//   // Get the next patient to be seen
//   getNextPatient: async () => {
//     try {
//       const response = await api.get('/queue/next');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching next patient:', error);
//       throw error;
//     }
//   },
  
//   // Remove a patient from the queue
//   removeFromQueue: async (patientId) => {
//     try {
//       const response = await api.delete(`/queue/${patientId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Error removing patient from queue:', error);
//       throw error;
//     }
//   },
  
//   // Clear the entire queue
//   clearQueue: async () => {
//     try {
//       const response = await api.delete('/queue');
//       return response.data;
//     } catch (error) {
//       console.error('Error clearing queue:', error);
//       throw error;
//     }
//   },
// };

// export default apiService;
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

const apiService = {
  // Patient endpoints
  submitPatientInfo: (data) => api.post('/patients', data),
  submitVitals: (data) => api.post('/patients/vitals', data),
  
  // Queue endpoints
  getQueue: async () => {
    try {
      const response = await api.get('/queue');
      return response.data;
    } catch (error) {
      console.error("Error fetching queue:", error);
      return { data: [] }; // Return empty data instead of throwing
    }
  },
  
  // Updated to match actual server endpoint - removed /stats
  getQueueStats: async () => {
    try {
      // Just use the regular queue endpoint since /stats doesn't exist
      const response = await api.get('/queue');
      const queueData = response.data || [];
      
      // Calculate stats from the queue data
      const stats = {
        totalPatients: queueData.length,
        highPriority: queueData.filter(p => 
          (p.risk_level || p.priorityInfo?.risk_level) === 'High').length,
        mediumPriority: queueData.filter(p => 
          (p.risk_level || p.priorityInfo?.risk_level) === 'Medium').length,
        lowPriority: queueData.filter(p => 
          (p.risk_level || p.priorityInfo?.risk_level) === 'Low').length
      };
      
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
  
  // Admin endpoint for calling next patient
  callNextPatient: () => api.delete('/queue/next')
};

export default apiService;
