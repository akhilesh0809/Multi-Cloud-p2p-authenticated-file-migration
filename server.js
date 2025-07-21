const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USER_FILES_DB_DIR = path.join(__dirname, 'user_files_db');
const USERS_DB_PATH = path.join(__dirname, 'users.json');

const SHARED_USERNAME = 'demo';
const SHARED_PASSWORD_RAW = 'password123';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

const delay = ms => new Promise(res => setTimeout(res, ms));

async function loadUsers() {
    try {
        const data = await fsPromises.readFile(USERS_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const hashedPassword = await bcrypt.hash(SHARED_PASSWORD_RAW, 10);
            const initialUsers = {
                [SHARED_USERNAME]: {
                    password: hashedPassword,
                    email: 'demo@example.com',
                    mobile: ''
                }
            };
            await fsPromises.writeFile(USERS_DB_PATH, JSON.stringify(initialUsers, null, 2), 'utf8');
            return initialUsers;
        }
        console.error('Error loading users:', error);
        return {};
    }
}

async function saveUsers(users) {
    await fsPromises.writeFile(USERS_DB_PATH, JSON.stringify(users, null, 2), 'utf8');
}

function getUserFilesDBPath(username) {
    return path.join(USER_FILES_DB_DIR, `${username}_files.json`);
}

async function loadUserFiles(username) {
    const userFilesDBPath = getUserFilesDBPath(username);
    try {
        const data = await fsPromises.readFile(userFilesDBPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error(`Error loading files for user ${username}:`, error);
        return [];
    }
}

async function saveUserFiles(username, files) {
    const userFilesDBPath = getUserFilesDBPath(username);
    await fsPromises.writeFile(userFilesDBPath, JSON.stringify(files, null, 2), 'utf8');
}

app.post('/api/register', async (req, res) => {
    const { username, password, email, mobile } = req.body;
    const users = await loadUsers();

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    if (users[username]) {
        return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    const emailExists = Object.values(users).some(user => user.email === email);
    if (email && emailExists) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = { password: hashedPassword, email, mobile };
        await saveUsers(users);
        await saveUserFiles(username, []);
        res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

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

const authenticateUser = (req, res, next) => {
    const username = req.headers['x-username'];
    if (!username) {
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    req.username = username;
    next();
};

app.post('/api/upload', authenticateUser, upload.single('fileInput'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const username = req.username;
    let files = await loadUserFiles(username);

    const isDuplicate = files.some(existingFile =>
        existingFile.name === req.file.originalname && existingFile.size === req.file.size
    );

    if (isDuplicate) {
        await fsPromises.unlink(req.file.path);
        return res.status(409).json({ message: 'Duplicate file exists. Upload aborted.' });
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

app.get('/api/files', authenticateUser, async (req, res) => {
    const username = req.username;
    const files = await loadUserFiles(username);
    res.status(200).json(files);
});

app.get('/api/download/:fileId', authenticateUser, async (req, res) => {
    const { fileId } = req.params;
    const username = req.username;
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
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Failed to download file.' });
    }
});

app.get('/api/view/:fileId', authenticateUser, async (req, res) => {
    const { fileId } = req.params;
    const username = req.username;
    const userFiles = await loadUserFiles(username);
    const fileToView = userFiles.find(file => file.id === fileId);

    if (!fileToView) {
        return res.status(404).json({ message: 'File not found.' });
    }

    const filePath = path.join(UPLOADS_DIR, fileId);

    try {
        await fsPromises.access(filePath);
        res.setHeader('Content-Type', fileToView.mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${fileToView.name}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error('View error:', error);
        res.status(500).json({ message: 'Failed to view file.' });
    }
});

app.delete('/api/delete/:filename', authenticateUser, async (req, res) => {
    const filename = req.params.filename;
    const username = req.username;
    let files = await loadUserFiles(username);
    const fileToDelete = files.find(file => file.id === filename);

    if (!fileToDelete) {
        return res.status(404).json({ message: 'File not found or permission denied.' });
    }

    files = files.filter(file => file.id !== filename);
    await saveUserFiles(username, files);

    const filePath = path.join(UPLOADS_DIR, filename);
    try {
        await fsPromises.unlink(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Unlink error:', err);
        }
    }

    res.status(200).json({ message: 'File deleted successfully!' });
});

app.post('/api/transfer-file', authenticateUser, async (req, res) => {
    const { fileId, recipientEmail } = req.body;
    const senderUsername = req.username;
    const senderFiles = await loadUserFiles(senderUsername);
    const fileToCopy = senderFiles.find(file => file.id === fileId);

    if (!fileToCopy) return res.status(404).json({ message: 'File not found.' });

    const users = await loadUsers();
    let recipientUsername = null;
    for (const userKey in users) {
        if (users[userKey].email === recipientEmail) {
            recipientUsername = userKey;
            break;
        }
    }

    if (!recipientUsername) {
        return res.status(404).json({ message: 'Recipient not found.' });
    }

    if (recipientUsername === senderUsername) {
        return res.status(400).json({ message: 'Cannot transfer to yourself.' });
    }

    let recipientFiles = await loadUserFiles(recipientUsername);
    const exists = recipientFiles.some(file => file.id === fileToCopy.id && file.name === fileToCopy.name);

    if (exists) {
        return res.status(409).json({ message: 'Recipient already has this file.' });
    }

    // ✅ Set owner to recipient
    recipientFiles.push({ ...fileToCopy, owner: recipientUsername });
    await saveUserFiles(recipientUsername, recipientFiles);
    res.status(200).json({ message: `File "${fileToCopy.name}" transferred successfully.` });
});

app.post('/api/transfer-multiple-files', authenticateUser, async (req, res) => {
    const { fileIds, recipientEmail } = req.body;
    const senderUsername = req.username;

    if (!fileIds || !Array.isArray(fileIds) || !recipientEmail) {
        return res.status(400).json({ message: 'Invalid input.' });
    }

    const users = await loadUsers();
    let recipientUsername = null;
    for (const userKey in users) {
        if (users[userKey].email === recipientEmail) {
            recipientUsername = userKey;
            break;
        }
    }
    if (!recipientUsername) return res.status(404).json({ message: 'Recipient not found.' });
    if (recipientUsername === senderUsername) return res.status(400).json({ message: 'Cannot transfer to yourself.' });

    const senderFiles = await loadUserFiles(senderUsername);
    const recipientFiles = await loadUserFiles(recipientUsername);

    const transferred = [];
    const skipped = [];

    for (const fileId of fileIds) {
        const file = senderFiles.find(f => f.id === fileId);
        if (!file) continue;

        const alreadyExists = recipientFiles.some(rf => rf.id === file.id && rf.name === file.name);
        if (alreadyExists) {
            skipped.push(file.name);
        } else {
            // ✅ Set owner to recipient
            recipientFiles.push({ ...file, owner: recipientUsername });
            transferred.push(file.name);
        }
    }

    await saveUserFiles(recipientUsername, recipientFiles);
    const message = `${transferred.length} file(s) transferred. ${skipped.length} skipped.`;
    res.status(200).json({ message });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
