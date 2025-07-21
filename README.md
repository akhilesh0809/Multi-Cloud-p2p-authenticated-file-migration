🌩️ CloudLink – Seamless Cloud Migration
---
> Click here for Live Demo : (https://cloud-link-p2p.vercel.app)
---
> A modern web application that allows users to securely upload, manage, view, download, search, and transfer files over the cloud with real-time progress monitoring and a clean UI.

---

🚀 Features

- 🔐 User Authentication (Register & Login)
- 📤 Upload Files with real-time progress
- 📁 View All Uploaded Files
- 📥 Download Files
- 🔍 Search and Filter Files
- 📨 Transfer Individual or All Files to another user by email
- 🗑️ Delete Files
- 🧠 Summarize Document Content (offline and AI modes supported)
- 📊 Transfer Progress Monitoring
- 💅 Blue-Violet animated theme (ColorHunt palette)
- 🌐 Fully responsive and user-friendly interface

---

🛠️ Technologies Used

- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js, Express.js
- Storage: Filesystem with JSON-based DB (for users and metadata)
- Security: Bcrypt for password hashing
- Styling: Custom CSS 

---

📁 Project Structure

CloudLink/
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   ├── uploads/           # Stores uploaded files
│   ├── index.html
│   └── MainLogo.png
│
├── user_files_db/         # Per-user file metadata JSON files
├── users.json             # Stores user credentials
├── server.js              # Express server
├── package.json
└── README.md              # This file

---

🔧 Setup Instructions

1. Clone the Repository
   git clone https://github.com/akhilesh0809/Mini-Project.git
   cd Mini-Project

2. Install Dependencies
   npm install

3. Run the Server
   node server.js

4. Visit the App
   http://localhost:3000

---

🧪 Test Credentials

Use the preconfigured demo user:
- Username: demo
- Password: password123

---

📦 Sample Users (in users.json)

{
  "demo": {
    "password": "<hashed_password>",
    "email": "demo@example.com",
    "mobile": ""
  }
}

---

📌 Notes

- Uploaded files are saved in /uploads folder.
- Files are tracked per user using user_files_db/{username}_files.json.
- No database (like MySQL or MongoDB) is needed.
- Email is used for identifying recipients in file transfers.

---

🤝 Contributions

Pull requests are welcome! For major changes, please open an issue first.

---

📜 License

This project is open-source and free to use under the MIT License.
