document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements from current backend-integrated version ---
    const authSection = document.getElementById('authSection');
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Form Inputs
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');

    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const registerEmailInput = document.getElementById('registerEmail');
    const registerMobileInput = document.getElementById('registerMobile');

    // Messages
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');

    // Toggle Links
    const switchToRegisterLink = document.getElementById('switchToRegister');
    const switchToLoginLink = document.getElementById('switchToLogin');

    // Logout Buttons (from header and dashboard)
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardLogoutBtn = document.getElementById('dashboardLogoutBtn');

    const dashboardSection = document.getElementById('dashboardSection');
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadedFilesList = document.getElementById('uploadedFilesList');
    // NEW: Downloadable files list for the current user
    const downloadableUserFilesList = document.getElementById('downloadableUserFilesList');
    const dashboardUsernameSpan = document.getElementById('dashboardUsername');
    const selectedFileName = document.getElementById('selectedFileName');

    // Progress bar elements and upload button reference
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const uploadButton = document.getElementById('uploadButton');

    // --- NEW: Search Feature DOM Elements ---
    const searchFileSection = document.getElementById('searchFileSection');
    const searchInput = document.getElementById('searchInput');
    const searchResultsList = document.getElementById('searchResultsList');
    // NEW: Filter and Sort Elements
    const fileTypeFilter = document.getElementById('fileTypeFilter');
    const sortBy = document.getElementById('sortBy');

    // NEW: Download Files section
    const downloadFilesSection = document.getElementById('downloadFilesSection');

    // --- NEW: Transfer a Copy Feature DOM Elements ---
    const transferCopySection = document.getElementById('transferCopySection');
    const transferForm = document.getElementById('transferForm');
    const fileToTransferSelect = document.getElementById('fileToTransfer');
    const recipientEmailInput = document.getElementById('recipientEmail'); // Changed from recipientUsernameInput
    const transferStatus = document.getElementById('transferStatus');
    


    // --- DOM Elements from previous demo version (`j.js`) ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navList = document.querySelector('.nav-list');
    const heroSection = document.getElementById('hero');
    const problemSection = document.getElementById('problem');
    const solutionSection = document.getElementById('solution');
    const howItWorksSection = document.getElementById('how-it-works');
    const contactSection = document.getElementById('contact');

    // How It Works Section - Step-by-step animation
    const steps = document.querySelectorAll('.how-it-works-section .step');
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    let currentStepIndex = 0;

    // Contact Form
    const contactForm = document.querySelector('.contact-form');

    // --- Backend API Base URL ---
    // const API_BASE_URL = 'http://localhost:3000/api';
    const API_BASE_URL = 'https://multi-cloud-p2p-authenticated-file.onrender.com/api';
    // const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;



    // --- State Variable for Current User ---
    let loggedInUsername = localStorage.getItem('loggedInUsername');
    let allUserFiles = []; // This will now only store files owned by the logged-in user

    // --- Helper Functions ---

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Function to format timestamp
    function formatTimestamp(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        return date.toLocaleString('en-GB', options);
    }

    // Function to get file icon class based on extension
    function getFileIconClass(fileName) {
        const fileNameLower = fileName.toLowerCase();
        if (fileNameLower.endsWith('.pdf')) {
            return 'fas fa-file-pdf';
        } else if (fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx')) {
            return 'fas fa-file-word';
        } else if (fileNameLower.endsWith('.xls') || fileNameLower.endsWith('.xlsx')) {
            return 'fas fa-file-excel';
        } else if (fileNameLower.endsWith('.ppt') || fileNameLower.endsWith('.pptx')) {
            return 'fas fa-file-powerpoint';
        } else if (fileNameLower.endsWith('.zip') || fileNameLower.endsWith('.rar')) {
            return 'fas fa-file-archive';
        } else if (fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.png') || fileNameLower.endsWith('.gif')) {
            return 'fas fa-file-image';
        } else if (fileNameLower.endsWith('.txt')) {
            return 'fas fa-file-alt';
        }
        return 'fas fa-file';
    }


    async function fetchFiles() {
        if (!loggedInUsername) {
            console.warn("Attempted to fetch files without a logged-in user.");
            handleLogout();
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/files`, {
                headers: {
                    'x-username': loggedInUsername
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    alert("Your session expired or is invalid. Please log in again.");
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            allUserFiles = files; // This will now only contain files owned by the logged-in user
            renderFileLists(files);
            handleSearchFiles(); // Initially show all logged-in user's files, now applying filters/sort by default
            populateFileToTransferDropdown(files); // NEW: Populate transfer dropdown
        } catch (error) {
            console.error('Error fetching files:', error);
            uploadedFilesList.innerHTML = '<li style="color: red;">Error loading files.</li>';
            downloadableUserFilesList.innerHTML = '<li style="color: red;">Error loading files.</li>'; // NEW
            searchResultsList.innerHTML = '<li style="color: red;">Error loading files for search.</li>';
            fileToTransferSelect.innerHTML = '<option value="">Error loading files</option>'; // NEW
        }
    }

    function renderFileLists(files) {
        uploadedFilesList.innerHTML = '';
        downloadableUserFilesList.innerHTML = ''; // Clear the new download list
        const ownedFiles = files.filter(file => file.owner === loggedInUsername); // This will always be true now
        if (ownedFiles.length === 0) {
            uploadedFilesList.innerHTML = '<li class="no-files">No files uploaded by you yet.</li>';
            downloadableUserFilesList.innerHTML = '<li class="no-files">No files available for download.</li>'; // NEW
        } else {
            ownedFiles.forEach(file => {
                const fileIconClass = getFileIconClass(file.name);
                const formattedUploadTime = file.uploadedAt ? formatTimestamp(file.uploadedAt) : 'N/A';
                // For Your Uploaded Files section (with Delete and View)
                const ownerLi = document.createElement('li');
                ownerLi.innerHTML = `
                    <div class="file-info">
                        <span class="file-name-display"><i class="${fileIconClass}"></i> ${file.name}</span>
                        <span class="file-details">${formatBytes(file.size)} | Uploaded: ${formattedUploadTime}</span>
                    </div>
                    <div class="file-actions">
                        <button class="btn view-btn" data-id="${file.id}" data-name="${file.name}"><i class="fas fa-eye"></i> Preview</button>
                        <button class="btn delete-btn" data-id="${file.id}"><i class="fas fa-trash-alt"></i> Delete</button>
                    </div>
                `;
                uploadedFilesList.appendChild(ownerLi);
                // For NEW Download Files section (with Download and View)
                const downloadLi = document.createElement('li');
                downloadLi.innerHTML = `
                    <div class="file-info">
                        <span class="file-name-display"><i class="${fileIconClass}"></i> ${file.name}</span>
                        <span class="file-details">${formatBytes(file.size)} | Uploaded: ${formattedUploadTime}</span>
                    </div>
                    <div class="file-actions">
                        <button class="btn view-btn" data-id="${file.id}" data-name="${file.name}"><i class="fas fa-eye"></i> Preview</button>
                        <button class="btn download-btn" data-file-id="${file.id}" data-file-name="${file.name}"><i class="fas fa-download"></i> Download</button>
                    </div>
                `;
                downloadableUserFilesList.appendChild(downloadLi); // NEW
            });
        }
        addFileListEventListeners(uploadedFilesList); // Add listeners for owned files
        addFileListEventListeners(downloadableUserFilesList); // NEW: Add listeners for downloadable files
    }

    // Function to render search results (now only searches owned files)
    function renderSearchResults(filesToDisplay) {
        searchResultsList.innerHTML = '';
        if (filesToDisplay.length === 0) {
            searchResultsList.innerHTML = '<li class="no-files">No matching files found.</li>';
            return;
        }

        filesToDisplay.forEach(file => {
            const fileIconClass = getFileIconClass(file.name);
            const formattedUploadTime = file.uploadedAt ? formatTimestamp(file.uploadedAt) : 'N/A';

            const searchLi = document.createElement('li');
            searchLi.innerHTML = `
                <div class="file-info">
                    <span class="file-name-display"><i class="${fileIconClass}"></i> ${file.name}</span>
                    <span class="file-details">${formatBytes(file.size)} | Uploaded: ${formattedUploadTime} | Owner: ${file.owner}</span>
                </div>
                <div class="file-actions">
                    <button class="btn view-btn" data-id="${file.id}" data-name="${file.name}"><i class="fas fa-eye"></i> Preview</button>
                    <button class="btn download-btn" data-file-id="${file.id}" data-file-name="${file.name}"><i class="fas fa-download"></i> Download</button>
                </div>
            `;
            searchResultsList.appendChild(searchLi);
        });
        addFileListEventListeners(searchResultsList);
    }

    // NEW: Function to populate the file transfer dropdown
    function populateFileToTransferDropdown(files) {
        fileToTransferSelect.innerHTML = '<option value="">-- Select a file --</option>'; // Reset
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.id;
            option.textContent = file.name;
            fileToTransferSelect.appendChild(option);
        });
    }


    function addFileListEventListeners(container) {
        container.querySelectorAll('.delete-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', () => handleDeleteFile(newButton.dataset.id));
        });

        container.querySelectorAll('.view-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', (event) => handleViewDocument(event.target.dataset.id, event.target.dataset.name));
        });

        container.querySelectorAll('.download-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', (event) => handleDownloadFile(event.target.dataset.fileId, event.target.dataset.fileName));
        });
    }


    function displayAuthMessage(element, message, isSuccess) {
        element.textContent = message;
        element.classList.remove('hidden', 'success', 'error');
        element.classList.add(isSuccess ? 'success' : 'error');
    }

    function hideAuthMessages() {
        loginMessage.classList.add('hidden');
        registerMessage.classList.add('hidden');
        loginMessage.textContent = '';
        registerMessage.textContent = '';
    }

    // NEW: Function to display transfer status messages
    function displayTransferMessage(message, isSuccess) {
        transferStatus.textContent = message;
        transferStatus.classList.remove('hidden', 'success', 'error');
        transferStatus.classList.add(isSuccess ? 'success' : 'error');
        setTimeout(() => transferStatus.classList.add('hidden'), 5000);
    }


    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // --- UI State Management (Show/Hide Sections) ---

    function togglePublicNav(show) {
        const publicNavItems = navList.querySelectorAll('li:not(#logoutBtn)');
        publicNavItems.forEach(item => {
            if (show) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }

    function hideAllSections() {
        heroSection.classList.add('hidden');
        problemSection.classList.add('hidden');
        solutionSection.classList.add('hidden');
        howItWorksSection.classList.add('hidden');
        contactSection.classList.add('hidden');
        authSection.classList.add('hidden');
        dashboardSection.classList.add('hidden');
    }

    // --- References to dashboard panels ---
    const uploadFileSection = document.getElementById('uploadFileSection');
    const viewFilesSection = document.getElementById('viewFilesSection');
    // const downloadableFilesSection = document.getElementById('downloadableFilesSection'); // OLD, removed
    // NEW: Download Files section
    // const downloadFilesSection = document.getElementById('downloadFilesSection'); // Already defined above
    // const searchFileSection = document.getElementById('searchFileSection'); // Already defined above
    // const transferCopySection = document.getElementById('transferCopySection'); // Already defined above


    function hideAllDashboardPanels() {
        uploadFileSection.classList.add('hidden');
        viewFilesSection.classList.add('hidden');
        downloadFilesSection.classList.add('hidden'); // NEW
        searchFileSection.classList.add('hidden');
        transferCopySection.classList.add('hidden'); // NEW
    }

    function displayLoggedInState() {
        hideAllSections();
        dashboardSection.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        togglePublicNav(false);

        navList.classList.add('active');

        if (loggedInUsername) {
            dashboardUsernameSpan.textContent = loggedInUsername;
        } else {
            dashboardUsernameSpan.textContent = '';
        }

        hideAllDashboardPanels();
        uploadFileSection.classList.remove('hidden'); // Default to upload section

        fetchFiles();
        document.querySelector('#dashboardSection').scrollIntoView({ behavior: 'smooth' });
    }

    function displayLoggedOutState() {
        hideAllSections();
        heroSection.classList.remove('hidden');
        problemSection.classList.remove('hidden');
        solutionSection.classList.remove('hidden');
        howItWorksSection.classList.remove('hidden');
        contactSection.classList.remove('hidden');
        authSection.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        togglePublicNav(true);

        navList.classList.remove('active');

        showLoginForm();

        document.querySelector('body').scrollIntoView({ behavior: 'smooth' });
    }

    // --- Toggle Form Functionality ---
    function showLoginForm() {
        loginPanel.classList.remove('hidden');
        registerPanel.classList.add('hidden');
        hideAuthMessages();
        loginForm.reset();
        registerForm.reset();
    }

    function showRegisterForm(prefillUsername = '') {
        loginPanel.classList.add('hidden');
        registerPanel.classList.remove('hidden');
        hideAuthMessages();
        loginForm.reset();
        registerForm.reset();
        if (prefillUsername) {
            registerUsernameInput.value = prefillUsername;
        }
    }

    // --- Event Listeners ---

    // Smooth scroll for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.parentNode && this.parentNode.id !== 'logoutBtn') {
                e.preventDefault();

                if (navList.classList.contains('active')) {
                    navList.classList.remove('active');
                    menuToggle.classList.remove('active');
                }

                const targetId = this.getAttribute('href');
                if (targetId.startsWith('#')) {
                    document.querySelector(targetId).scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Mobile menu toggle
    menuToggle.addEventListener('click', () => {
        navList.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });

    // How It Works section navigation
    function showStep(index) {
        steps.forEach((step, i) => {
            if (i === index) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === steps.length - 1;
    }

    if (prevBtn && nextBtn && steps.length > 0) {
        showStep(currentStepIndex);
        nextBtn.addEventListener('click', () => {
            if (currentStepIndex < steps.length - 1) {
                currentStepIndex++;
                showStep(currentStepIndex);
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                showStep(currentStepIndex);
            }
        });
    }

    // Contact Form submission
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (name === '' || email === '' || message === '') {
                alert('Please fill in all fields.');
                return;
            }

            if (!isValidEmail(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            alert('Thank you for your message! We will get back to you shortly.');
            contactForm.reset();
        });
    }

    // Switch between Login and Register panels
    switchToRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
    });

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessages();

        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('loggedInUsername', username);
                loggedInUsername = username;
                displayLoggedInState();
                loginPasswordInput.value = '';
            } else {
                if (data.message && data.message.includes("User does not exist")) {
                    displayAuthMessage(loginMessage, data.message + " Please register.", false);
                    setTimeout(() => showRegisterForm(username), 1500);
                } else {
                    displayAuthMessage(loginMessage, data.message || 'Login failed. Please try again.', false);
                }
            }
        } catch (error) {
            console.error('Network error during login:', error);
            displayAuthMessage(loginMessage, 'Could not connect to the server. Please ensure the backend is running.', false);
        }
    });

    // Handle Register Form Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessages();

        const username = registerUsernameInput.value;
        const password = registerPasswordInput.value;
        const email = registerEmailInput.value;
        const mobile = registerMobileInput.value;

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email, mobile })
            });

            const data = await response.json();

            if (response.ok) {
                displayAuthMessage(registerMessage, data.message, true);
                registerForm.reset();
                loginUsernameInput.value = username;
                loginPasswordInput.value = '';
                setTimeout(() => showLoginForm(), 2000);
            } else {
                displayAuthMessage(registerMessage, data.message || 'Registration failed. Please try again.', false);
            }
        } catch (error) {
            console.error('Network error during registration:', error);
            displayAuthMessage(registerMessage, 'Could not connect to the server. Please ensure the backend is running.', false);
        }
    });

    // Logout functionality
    function handleLogout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInUsername');
        loggedInUsername = null;
        allUserFiles = [];
        displayLoggedOutState();
    }

    // Attach logout listeners to both buttons
    logoutBtn.addEventListener('click', handleLogout);
    if (dashboardLogoutBtn) {
        dashboardLogoutBtn.addEventListener('click', handleLogout);
    }

    // Event listener for file input change to update the displayed file name
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            selectedFileName.textContent = fileInput.files[0].name;
        } else {
            selectedFileName.textContent = 'No file chosen';
        }
    });

    // File upload submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!loggedInUsername) {
            uploadStatus.textContent = 'You must be logged in to upload files.';
            uploadStatus.classList.remove('hidden', 'success');
            uploadStatus.classList.add('error');
            setTimeout(() => uploadStatus.classList.add('hidden'), 6000);
            return;
        }

        const file = fileInput.files[0];
        if (!file) {
            uploadStatus.textContent = 'Please select a file to upload.';
            uploadStatus.classList.remove('hidden', 'success');
            uploadStatus.classList.add('error');
            setTimeout(() => uploadStatus.classList.add('hidden'), 6000);
            return;
        }

        const formData = new FormData();
        formData.append('fileInput', file);

        uploadStatus.classList.add('hidden');
        uploadProgressBar.classList.remove('hidden');
        uploadProgressText.classList.remove('hidden');
        uploadProgressBar.value = 0;
        uploadProgressText.textContent = '0%';
        uploadButton.disabled = true;

        const totalSimulatedTime = 3800;
        const step1Time = totalSimulatedTime * 0.25;
        const step2Time = totalSimulatedTime * 0.60;
        const step3Time = totalSimulatedTime * 0.83;

        setTimeout(() => {
            uploadProgressBar.value = 25;
            uploadProgressText.textContent = '25%';
        }, step1Time);

        setTimeout(() => {
            uploadProgressBar.value = 60;
            uploadProgressText.textContent = '60%';
        }, step2Time);

        setTimeout(() => {
            uploadProgressBar.value = 83;
            uploadProgressText.textContent = '83%';
        }, step3Time);


        try {
            const xhr = new XMLHttpRequest();

            xhr.open('POST', `${API_BASE_URL}/upload`, true);
            xhr.setRequestHeader('x-username', loggedInUsername);

            xhr.onload = () => {
                uploadProgressBar.classList.add('hidden');
                uploadProgressText.classList.add('hidden');
                uploadButton.disabled = false;

                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    uploadStatus.textContent = data.message;
                    uploadStatus.classList.remove('hidden', 'error');
                    uploadStatus.classList.add('success');
                    uploadProgressBar.value = 100;
                    uploadProgressText.textContent = '100%';
                    fetchFiles();
                    fileInput.value = '';
                    selectedFileName.textContent = 'No file chosen';
                } else {
                    const errorData = JSON.parse(xhr.responseText);
                    uploadStatus.textContent = errorData.message || 'File upload failed.';
                    uploadStatus.classList.remove('hidden', 'success');
                    uploadStatus.classList.add('error');
                    uploadProgressBar.value = 0;
                    uploadProgressText.textContent = '0%';
                }
                setTimeout(() => uploadStatus.classList.add('hidden'), 6000);
            };

            xhr.onerror = () => {
                uploadProgressBar.classList.add('hidden');
                uploadProgressText.classList.add('hidden');
                uploadButton.disabled = false;
                uploadStatus.textContent = 'Network error during upload. Could not connect to server.';
                uploadStatus.classList.remove('hidden', 'success');
                uploadStatus.classList.add('error');
                setTimeout(() => uploadStatus.classList.add('hidden'), 6000);
            };

            xhr.send(formData);

        } catch (error) {
            console.error('An unexpected client-side error occurred during upload:', error);
            uploadProgressBar.classList.add('hidden');
            uploadProgressText.classList.add('hidden');
            uploadButton.disabled = false;
            uploadStatus.textContent = 'An unexpected error occurred during upload.';
            uploadStatus.classList.remove('hidden', 'success');
            uploadStatus.classList.add('error');
            setTimeout(() => uploadStatus.classList.add('hidden'), 6000);
        }
    });

    // File deletion functionality
    async function handleDeleteFile(fileId) {
        const userConfirmed = window.confirm('Are you sure you want to delete this file from your cloud?');
        if (!userConfirmed) {
            return;
        }

        if (!loggedInUsername) {
             window.alert('You must be logged in to delete files.');
             return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/delete/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'x-username': loggedInUsername
                }
            });

            const data = await response.json();

            if (response.ok) {
                window.alert(data.message);
                fetchFiles();
            } else {
                window.alert(data.message || 'Failed to delete file.');
            }
        } catch (error) {
            console.error('Network error during delete:', error);
            window.alert('Could not connect to the server for deletion.');
        }
    }

    // Handle View Document functionality
    async function handleViewDocument(fileId, fileName) {
        if (!loggedInUsername) {
            window.alert('You must be logged in to view files.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/view/${fileId}`, {
                method: 'GET',
                headers: {
                    'x-username': loggedInUsername
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const newWindow = window.open(url, '_blank');

                if (newWindow) {
                    console.log(`Opened ${fileName} in new tab.`);
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                } else {
                    window.alert('Popup blocked! Please allow popups for this site to view documents.');
                    URL.revokeObjectURL(url);
                }
            } else {
                const errorData = await response.json();
                window.alert(errorData.message || 'Failed to view document. Please try again.');
            }
        } catch (error) {
            console.error('Error during file view:', error);
            window.alert('Network error during view. Could not connect to the server.');
        }
    }

    // Handle Download File functionality
    async function handleDownloadFile(fileId, fileName) {
        if (!loggedInUsername) {
            window.alert('You must be logged in to download files.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'x-username': loggedInUsername
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                const errorData = await response.json();
                window.alert(errorData.message || 'Failed to download file. Please try again.');
            }
        } catch (error) {
            console.error('Error during file download:', error);
            window.alert('Network error during download. Could not connect to the server.');
        }
    }

    // NEW: Helper to determine file type group for filtering
    function getFileTypeGroup(fileName) {
        const fileNameLower = fileName.toLowerCase();
        if (fileNameLower.endsWith('.pdf') || fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.txt')) {
            return 'document';
        } else if (fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.png') || fileNameLower.endsWith('.gif')) {
            return 'image';
        } else if (fileNameLower.endsWith('.zip') || fileNameLower.endsWith('.rar')) {
            return 'archive';
        }
        return 'other'; // For any other file types not explicitly listed
    }

    // Search functionality with filters and sorting
    searchInput.addEventListener('input', () => {
        handleSearchFiles();
    });

    fileTypeFilter.addEventListener('change', () => {
        handleSearchFiles();
    });

    sortBy.addEventListener('change', () => {
        handleSearchFiles();
    });

    function handleSearchFiles() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedFileType = fileTypeFilter.value;
        const selectedSortBy = sortBy.value;

        let filteredFiles = allUserFiles.filter(file => {
            const matchesSearchTerm = file.name.toLowerCase().includes(searchTerm);
            const fileTypeMatchesFilter = selectedFileType === 'all' || getFileTypeGroup(file.name) === selectedFileType;
            return matchesSearchTerm && fileTypeMatchesFilter;
        });

        // Sorting logic
        filteredFiles.sort((a, b) => {
            switch (selectedSortBy) {
                case 'nameAsc':
                    return a.name.localeCompare(b.name);
                case 'nameDesc':
                    return b.name.localeCompare(a.name);
                case 'dateDesc':
                    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
                case 'dateAsc':
                    return new Date(a.uploadedAt) - new Date(b.uploadedAt);
                case 'sizeDesc':
                    return b.size - a.size;
                case 'sizeAsc':
                    return a.size - b.size;
                default:
                    return 0;
            }
        });

        renderSearchResults(filteredFiles);
    }

    // NEW: Handle File Transfer Submission
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        transferStatus.classList.add('hidden'); // Hide previous messages

        if (!loggedInUsername) {
            displayTransferMessage('You must be logged in to transfer files.', false);
            return;
        }

        const fileId = fileToTransferSelect.value;
        const recipientEmail = recipientEmailInput.value.trim(); // Changed from recipientUsername

        if (!fileId) {
            displayTransferMessage('Please select a file to transfer.', false);
            return;
        }
        if (!recipientEmail) { // Changed from recipientUsername
            displayTransferMessage('Please enter a recipient email.', false);
            return;
        }
        if (!isValidEmail(recipientEmail)) {
            displayTransferMessage('Please enter a valid recipient email address.', false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/transfer-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-username': loggedInUsername
                },
                body: JSON.stringify({ fileId, recipientEmail }) // Changed recipientUsername to recipientEmail
            });

            const data = await response.json();

            if (response.ok) {
                displayTransferMessage(data.message, true);
                transferForm.reset();
            } else {
                displayTransferMessage(data.message || 'File transfer failed. Please try again.', false);
            }
        } catch (error) {
            console.error('Network error during file transfer:', error);
            displayTransferMessage('Could not connect to the server for file transfer.', false);
        }
    });
    //here//
    const transferAllForm = document.getElementById('transferAllForm');
    const allRecipientEmail = document.getElementById('allRecipientEmail');
    const transferAllStatus = document.getElementById('transferAllStatus');

    function displayTransferAllMessage(message, isSuccess) {
        transferAllStatus.textContent = message;
        transferAllStatus.classList.remove('hidden', 'success', 'error');
        transferAllStatus.classList.add(isSuccess ? 'success' : 'error');
        setTimeout(() => transferAllStatus.classList.add('hidden'), 5000);
    }

    transferAllForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipient = allRecipientEmail.value.trim();

        if (!isValidEmail(recipient)) {
            displayTransferAllMessage('Please enter a valid recipient email.', false);
            return;
        }

        if (!allUserFiles.length) {
            displayTransferAllMessage('You have no files to transfer.', false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/transfer-multiple-files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-username': loggedInUsername
                },
                body: JSON.stringify({
                    recipientEmail: recipient,
                    fileIds: allUserFiles.map(file => file.id)
                })
            });

            const result = await response.json();

            if (response.ok) {
                displayTransferAllMessage(result.message, true);
                transferAllForm.reset();
            } else {
                displayTransferAllMessage(result.message || 'Transfer failed.', false);
            }
        } catch (error) {
            console.error('Error during bulk file transfer:', error);
            displayTransferAllMessage('Network error. Try again later.', false);
        }
    });

     //here//

    // --- Add event listeners for dashboard navigation links ---
    const dashboardNavLinks = document.querySelectorAll('.dashboard-nav a, .dashboard-nav button'); // Include buttons for logout
    dashboardNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Check if it's the logout button inside the dashboard nav
            if (this.id === 'dashboardLogoutBtn') {
                handleLogout(); // Call the logout function
                return;
            }

            e.preventDefault(); // Prevent default link behavior for panel links

            hideAllDashboardPanels(); // Hide all panels

            const targetId = this.getAttribute('href'); // Get the href to determine target panel
            const targetPanel = document.querySelector(targetId);

            if (targetPanel) {
                targetPanel.classList.remove('hidden'); // Show the selected panel
                if (targetId === '#searchFileSection') {
                    searchInput.value = '';
                    handleSearchFiles(); // Call handleSearchFiles to apply filters/sort on section load
                } else if (targetId === '#transferCopySection') { // NEW: Handle transfer section
                    transferForm.reset();
                    transferStatus.classList.add('hidden');
                    populateFileToTransferDropdown(allUserFiles); // Ensure dropdown is fresh
                }
            }
        });
    });

    // --- Initial Load Check ---
    if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('loggedInUsername')) {
        loggedInUsername = localStorage.getItem('loggedInUsername');
        displayLoggedInState();
    } else {
        displayLoggedOutState();
    }
    
});