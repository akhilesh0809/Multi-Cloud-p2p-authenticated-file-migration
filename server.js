const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors'); // This line is already here, keep it

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USER_FILES_DB_DIR = path.join(__dirname, 'user_files_db');
const USERS_DB_PATH = path.join(__dirname, 'users.json');

const SHARED_USERNAME = 'demo';
const SHARED_PASSWORD_RAW = 'password123';

// --- Middleware ---
// THIS IS THE UPDATED CORS CONFIGURATION
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend
app.use(express.static(path.join(__dirname, 'public')));


// --- Multer Storage for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + originalExtension);
    }
});
const upload = multer({ storage: storage });

// --- Helper Functions ---

// Artificial delay function
const delay = ms => new Promise(res => setTimeout(res, ms));


// Load or initialize user credentials
async function loadUsers() {
    try {
        const data = await fsPromises.readFile(USERS_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('users.json not found. Initializing with default user...');
            const hashedPassword = await bcrypt.hash(SHARED_PASSWORD_RAW, 10);
            const initialUsers = { [SHARED_USERNAME]: { password: hashedPassword } };
            await fsPromises.writeFile(USERS_DB_PATH, JSON.stringify(initialUsers, null, 2), 'utf8');
            return initialUsers;
        }
        console.error('Error loading users:', error);
        return {};
    }
}

// Save user credentials
async function saveUsers(users) {
    await fsPromises.writeFile(USERS_DB_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// Get the path for a specific user's files DB
function getUserFilesDBPath(username) {
    return path.join(USER_FILES_DB_DIR, `${username}_files.json`);
}

// Load a specific user's files metadata
async function loadUserFiles(username) {
    const userFilesDBPath = getUserFilesDBPath(username);
    try {
        const data = await fsPromises.readFile(userFilesDBPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []; // Return empty array if user's file DB not found
        }
        console.error(`Error loading files for user ${username}:`, error);
        return [];
    }
}

// Save a specific user's files metadata
async function saveUserFiles(username, files) {
    const userFilesDBPath = getUserFilesDBPath(username);
    await fsPromises.writeFile(userFilesDBPath, JSON.stringify(files, null, 2), 'utf8');
}


// --- API Endpoints ---

// Register Endpoint
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const users = await loadUsers();

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    if (users[username]) {
        return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = { password: hashedPassword };
        await saveUsers(users);

        // Initialize an empty files.json for the new user
        await saveUserFiles(username, []);

        res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});


// Login Endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await loadUsers();

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = users[username];
    if (user && await bcrypt.compare(password, user.password)) {
        res.status(200).json({ success: true, message: 'Login successful!' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
});

// Authentication Middleware (A simple check if username is provided)
const authenticateUser = (req, res, next) => {
    const username = req.headers['x-username'];
    if (!username) {
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    req.username = username;
    next();
};


// Upload File Endpoint
app.post('/api/upload', authenticateUser, upload.single('fileInput'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const username = req.username;
    let files = [];
    try {
        files = await loadUserFiles(username);
    } catch (error) {
        console.error(`Error loading user files for duplicate check: ${error.message}`);
    }


    // Check for duplicate file (same original name and size)
    const isDuplicate = files.some(existingFile =>
        existingFile.name === req.file.originalname && existingFile.size === req.file.size
    );

    if (isDuplicate) {
        try {
            await fsPromises.unlink(req.file.path);
            console.log(`Deleted duplicate file: ${req.file.path}`);
        } catch (unlinkError) {
            console.error(`Error deleting duplicate file ${req.file.path}:`, unlinkError);
        }
        return res.status(409).json({ message: 'A file with this name and size already exists. Duplicate upload prevented.' });
    }


    const newFile = {
        id: req.file.filename,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        owner: username
    };
    files.push(newFile);
    await saveUserFiles(username, files);

    await delay(4000);

    res.status(200).json({ message: 'File uploaded successfully!', file: newFile });
});

// Get All Files Endpoint (MODIFIED BACK TO ORIGINAL BEHAVIOR)
app.get('/api/files', authenticateUser, async (req, res) => {
    const username = req.username;
    const files = await loadUserFiles(username); // Only load files for the current user
    res.status(200).json(files);
});

// Download File Endpoint
app.get('/api/download/:fileId', authenticateUser, async (req, res) => {
    const fileId = req.params.fileId;
    const username = req.username;

    // Load only the current user's files to find the metadata
    const userFiles = await loadUserFiles(username);
    const fileToDownload = userFiles.find(file => file.id === fileId);

    if (!fileToDownload) {
        return res.status(404).json({ message: 'File not found in your list.' });
    }

    const filePath = path.join(UPLOADS_DIR, fileId);

    try {
        await fsPromises.access(filePath);

        res.setHeader('Content-Disposition', `attachment; filename="${fileToDownload.name}"`);
        res.setHeader('Content-Type', fileToDownload.mimetype || 'application/octet-stream');

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('Error streaming file for download:', err);
            res.status(500).json({ message: 'Error streaming file.' });
        });

    } catch (error) {
        console.error('Error during file download:', error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ message: 'File not found on server disk.' });
        } else {
            res.status(500).json({ message: 'Failed to download file.' });
        }
    }
});


// View File Endpoint for inline display
app.get('/api/view/:fileId', authenticateUser, async (req, res) => {
    const fileId = req.params.fileId;
    const username = req.username;

    // Load only the current user's files to find the metadata
    const userFiles = await loadUserFiles(username);
    const fileToView = userFiles.find(file => file.id === fileId);

    if (!fileToView) {
        return res.status(404).json({ message: 'File not found in your list.' });
    }

    const filePath = path.join(UPLOADS_DIR, fileId);

    try {
        await fsPromises.access(filePath);

        res.setHeader('Content-Type', fileToView.mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${fileToView.name}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('Error streaming file for view:', err);
            res.status(500).json({ message: 'Error streaming file.' });
        });

    } catch (error) {
        console.error('Error during file view:', error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ message: 'File not found on server disk.' });
        } else {
            res.status(500).json({ message: 'Failed to view file.' });
        }
    }
});


// Delete File Endpoint
app.delete('/api/delete/:filename', authenticateUser, async (req, res) => {
    const filename = req.params.filename;
    const username = req.username;

    try {
        let files = await loadUserFiles(username);

        const fileToDeleteMetadata = files.find(file => file.id === filename);

        if (!fileToDeleteMetadata) {
            return res.status(404).json({ message: 'File not found or you do not have permission to delete this file.' });
        }

        // Remove the file from the current user's metadata list
        files = files.filter(file => file.id !== filename);
        await saveUserFiles(username, files);

        // Delete the physical file from the uploads directory
        const filePath = path.join(UPLOADS_DIR, filename);
        try {
             await fsPromises.unlink(filePath);
             console.log(`Successfully deleted file from uploads: ${filename}`);
        } catch (unlinkError) {
            if (unlinkError.code === 'ENOENT') {
                console.warn(`File ${filename} not found on disk, but removed from user's list.`);
            } else {
                console.error(`Error deleting file from disk ${filename}:`, unlinkError);
            }
        }

        res.status(200).json({ message: 'File deleted successfully!' });
    } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ message: 'Failed to delete file.' });
    }
});

// --- Server Start ---
async function startServer() {
    try {
        await fsPromises.mkdir(UPLOADS_DIR, { recursive: true });
        console.log(`Ensured uploads directory exists: ${UPLOADS_DIR}`);
    } catch (error) {
        console.error('Failed to create uploads directory:', error);
        process.exit(1);
    }

    try {
        await fsPromises.mkdir(USER_FILES_DB_DIR, { recursive: true });
        console.log(`Ensured user files DB directory exists: ${USER_FILES_DB_DIR}`);
    } catch (error) {
        console.error('Failed to create user files DB directory:', error);
        process.exit(1);
    }

    await loadUsers();

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('Backend ready. Now access your frontend in a browser.');
    });
}

startServer();