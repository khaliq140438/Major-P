# 🏢 Business Connect Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.0.0-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?logo=socket.io&logoColor=white)

> A comprehensive B2B networking application designed to facilitate meaningful connections, communication, and real-time analytics for businesses. 

Business Connect Platform allows companies to register, build professional profiles, connect with other verified businesses, communicate in real-time, and track their monthly financial and network analytics to generate an automated platform credibility score.

---

## ✨ Key Features

- **🔐 Secure Authentication & Authorization**
  - Robust login and registration using JWT and bcrypt.
  - Role-based access control (Business vs. Admin).
  - Admin approval workflows for new business registrations.
- **🏢 Professional Business Profiles**
  - Detailed profiles showcasing company description, industry, location, website, and scale.
- **🤝 B2B Networking Engine**
  - Discover, send, and accept connection requests to build a verified network of business partners.
- **💬 Real-Time Messaging**
  - Instant chat functionality between connected businesses using WebSockets (`Socket.io`).
  - Read receipts and unread message tracking.
- **🔔 Live Notifications**
  - Push-based platform notifications for new connections, messages, and system alerts.
- **📈 Business Analytics Dashboard**
  - Track core metrics: Monthly Revenue, Gross Profit Margin, and Client Count.
  - Interactive data visualization powered by Chart.js.
- **⭐ Automated Credibility Scoring**
  - A dynamic scoring engine (0-100) evaluating profile completeness, data consistency, active network size, and platform tenure.

---

## 🛠️ Tech Stack

### Frontend Architecture
- **Framework**: React 18
- **Routing**: React Router DOM v6
- **Data Fetching**: Axios
- **Real-Time Client**: Socket.io-client
- **Visualization**: Chart.js & react-chartjs-2
- **UI Assets**: Lucide React Icons

### Backend Architecture
- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Database**: MySQL (via `mysql2` driver)
- **Security**: Helmet, Express Rate Limit, CORS configuration
- **Authentication**: JSON Web Tokens (JWT)
- **Real-Time Server**: Socket.io
- **Media/File Handling**: Multer
- **Email Service**: Nodemailer

---

## 📂 Project Structure

```text
business-connect/
├── backend/                # Node.js/Express API server
│   ├── controllers/        # Request handling logic
│   ├── middleware/         # Auth, validation, and error handling
│   ├── routes/             # API endpoint definitions
│   ├── server.js           # Server entry point
│   └── package.json        # Backend dependencies
├── frontend/               # React client application
│   ├── public/             # Static assets
│   ├── src/                # React components, pages, and hooks
│   └── package.json        # Frontend dependencies
├── schema.sql              # Database schema and table definitions
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/)

### 1. Database Setup
Create a new MySQL database and initialize it using the provided schema script:
```bash
# Log into MySQL and run the schema file
mysql -u your_username -p < schema.sql
```

### 2. Backend Initialization
Navigate to the backend directory, install dependencies, and start the server:
```bash
cd backend
npm install

# Create a .env file based on environment variables required (e.g., DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET, PORT)
# npm run dev starts the server with nodemon for hot-reloading
npm run dev
```

### 3. Frontend Initialization
In a new terminal window, navigate to the frontend directory, install dependencies, and boot up the React app:
```bash
cd frontend
npm install
npm start
```
*The application should now be running locally at `http://localhost:3000` (or your configured port).*

---

## 📜 License
This project is licensed under the **MIT License**.
