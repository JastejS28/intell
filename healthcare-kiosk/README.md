# Healthcare Kiosk System with Priority Queue Management

This project implements a healthcare kiosk system that assigns priority to patients in a queue based on their vital signs. The system integrates with an external API for priority assignment and provides a user-friendly interface for patient check-in and queue monitoring.

## Project Structure

The project is built using the MERN stack:
- MongoDB (simulated with in-memory storage for this demo)
- Express.js (backend API)
- React (frontend UI)
- Node.js (runtime environment)

```
healthcare-kiosk/
├── client/                   # React frontend
│   ├── public/               # Public assets
│   └── src/                  # Source files
│       ├── components/       # Reusable UI components
│       ├── pages/            # Page components
│       └── utils/            # Utility functions
└── server/                   # Express backend
    ├── server.js             # Main server file
    └── package.json          # Server dependencies
```

## Features

1. **Patient Registration**: Simple form for collecting patient information.
2. **Vital Signs Collection**: Interface for entering or measuring patient vital signs.
3. **Priority Assignment**: Integration with external API for assigning priority based on vital signs.
4. **Queue Management**: Real-time display of the patient queue with estimated wait times.
5. **Admin Dashboard**: Interface for managing the queue and monitoring system status.

## Technologies Used

- **Frontend**: React, Material-UI, Chart.js, Axios
- **Backend**: Node.js, Express, Axios
- **External API**: Integration with the priority assignment API at https://queue-assigner.onrender.com/

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the server directory:
   ```
   cd healthcare-kiosk/server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm run dev
   ```
   
   The server will run on http://localhost:5000

### Frontend Setup
1. Navigate to the client directory:
   ```
   cd healthcare-kiosk/client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```
   
   The client will run on http://localhost:3000

## API Endpoints

### Server API
- `GET /api/queue`: Get all patients in the queue
- `GET /api/queue/stats`: Get queue statistics
- `GET /api/queue/next`: Get the next patient to be seen
- `POST /api/patients/vitals`: Submit patient vital signs and get priority
- `DELETE /api/queue/:patientId`: Remove a patient from the queue
- `DELETE /api/queue`: Clear the entire queue

### External API
- `POST /predict/`: Send vital signs to get risk assessment and priority

## Admin Access
- Access the admin dashboard at `/admin`
- Default password: `admin123` (for demo purposes only)

## License
This project is for demonstration purposes only. All rights reserved.
