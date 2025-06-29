# Healthcare Kiosk System: Step-by-Step Guide

This document provides a detailed guide on how to set up, run, and use the Healthcare Kiosk System with Priority Queue Management.

## Setup and Installation

### Step 1: Clone the Repository
First, you need to have the project files on your local machine.

```bash
git clone <repository-url>
cd healthcare-kiosk
```

### Step 2: Set Up the Backend Server
The backend server handles API requests and manages the patient queue.

```bash
cd server
npm install
```

Create a `.env` file in the server directory with the following 
content:

```
PORT=5000
QUEUE_ASSIGNER_API=https://queue-assigner.onrender.com
```

Start the server:
```bash
npm run dev
```

You should see output indicating that the server is running on port 5000.

### Step 3: Set Up the Frontend Client
The frontend client provides the user interface for the healthcare kiosk.

```bash
cd ../client
npm install
```

Start the client:
```bash
npm start
```

This will automatically open your browser to http://localhost:3000 where you can see the healthcare kiosk application.

## Using the Application

### Patient Flow

#### Step 1: Landing Page
When you first open the application, you'll see the landing page with information about the healthcare kiosk and a "Start Patient Check-In" button.

#### Step 2: Patient Information Entry
After clicking the check-in button, you'll be directed to the Patient Information page where you need to enter:
- Full Name
- Age
- Gender
- Weight (in kg)
- Height (in meters)
- Optional contact information

Click "Next: Enter Vital Signs" to proceed.

#### Step 3: Vital Signs Entry
On this page, you'll need to enter the patient's vital signs:
- Heart Rate (BPM)
- Systolic Blood Pressure (mmHg)
- Diastolic Blood Pressure (mmHg)
- Body Temperature (°C)
- Oxygen Saturation (%)
- Respiratory Rate (breaths/min)

As you enter these values, you'll see a real-time visualization of how these values compare to normal ranges.

Click "Submit and Check Queue" to proceed.

#### Step 4: Queue Status
After submitting the vital signs, the system will:
1. Send the data to the priority assignment API
2. Calculate the patient's risk level and priority score
3. Place the patient in the appropriate position in the queue
4. Display the patient's queue information, including:
   - Queue position (shown as "Queue #X" where X is their position)
   - Estimated wait time (varies based on risk level, from 0 minutes to 1+ hours)
   - Risk level (High, Medium, or Low Risk)
   - Priority details including priority score and check-in time

The queue display will show all patients currently waiting with their vital information and estimated wait times, sorted by priority.

### Administrator Dashboard

#### Step 1: Access the Admin Dashboard
Navigate to http://localhost:3000/admin to access the administrator dashboard.

#### Step 2: Login
Use the following credentials:
- Password: `admin123` (for demo purposes)

#### Step 3: Manage the Queue
In the admin dashboard, you can:
- See all patients in the queue with their details
- Use the "Next Patient" button to get the highest-priority patient (calls the queue/next API)
- Remove individual patients from the queue after they've been seen
- Clear the entire queue when needed
- See accurate wait times that sync with the external queue API
- Refresh the queue data manually (automatic synchronization occurs every 10 minutes)

Queue management specific actions:
1. Click "Next Patient" to identify which patient should be called next
2. After processing a patient, click the "Remove" button next to their entry
3. The system will automatically update queue positions and wait times
4. Monitor the queue statistics to ensure efficient patient flow

### Staff Queue Management

#### Processing Patients Efficiently
To ensure patients don't accumulate in the waiting area, staff should follow this workflow:

1. **Call Next Patient**: 
   - Use the "Call Next Patient" button in the Admin Dashboard
   - This automatically calls the `/api/queue/next` endpoint which returns the highest priority patient
   - The system will highlight the next patient to be seen

2. **Process Patient**:
   - After the patient has been seen by healthcare staff, use the "Complete" button
   - This removes the patient from the queue using the `/api/queue/:patientId` endpoint
   - The queue will automatically update for all users

3. **Queue Synchronization**:
   - The system automatically synchronizes with the external queue API every 10 minutes
   - This ensures wait times and priority levels are accurate
   - Staff can manually trigger a sync by clicking "Refresh Queue" in the Admin Dashboard

#### Understanding Priority Display
As shown in the screenshots, patients are assigned to the queue with:
- A clear position number (Queue #1, Queue #2, etc.)
- Risk level indicator (colored badges: red for High Risk, yellow for Medium Risk, green for Low Risk)
- Estimated waiting time (calculated based on priority and external queue data)
- Patient information including age, blood pressure and check-in time

The system will automatically adjust wait times and positions as patients are processed based on their priority scores.

## Technical Details

### Data Flow
1. Patient enters their information and vital signs in the kiosk interface
2. Data is sent to the server via the `/api/patients/vitals` endpoint
3. Server forwards the data to the external priority assignment API
4. Priority API returns risk assessment and priority score
5. Server adds the patient to the queue based on priority
6. The system calls the `/queue/update-priorities/` external API to update the entire queue
7. Updated queue information is sent back to the client
8. Client displays the patient's position in queue (Queue #) and wait time

### API Endpoints

#### Patient Processing
- **GET `/api/queue/next`**: Retrieves the highest priority patient in the queue for processing
- **DELETE `/api/queue/:patientId`**: Removes a processed patient from the queue
- **GET `/api/queue`**: Gets the current queue with all patients' information
- **GET `/api/queue/stats`**: Gets statistics about current queue distribution

#### External API Integration
- **POST `/queue/update-priorities/`**: Updates all patients' priorities based on wait time and vitals
- **GET `/queue/`**: Gets the latest queue data from external system

## Troubleshooting

### Common Issues
- **Server Connection Failed**: Make sure the server is running on port 5000
- **API Connection Error**: Check that the external API is accessible
- **Queue Not Updating**: The auto-refresh might be failing, try using the refresh button
- **Form Submission Errors**: Ensure all required fields have valid values

For any other issues, check the browser console and server logs for error messages.
