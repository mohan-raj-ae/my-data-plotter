class DataUploadComponent {
    constructor(container, apiBaseUrl, onDatasetLoaded) {
        this.container = container;
        this.apiBaseUrl = apiBaseUrl;
        this.onDatasetLoaded = onDatasetLoaded;
        this.init();
    }
    
    init() {
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="upload-zone" id="uploadZone">
                <div class="upload-zone-content">
                    <svg class="upload-zone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-900">Drop files here or click to browse</p>
                    <p class="text-xs text-gray-500">CSV, TSV, Excel files supported</p>
                </div>
                <input type="file" id="fileInput" class="hidden" accept=".csv,.tsv,.xlsx,.xls">
            </div>
            
            <div id="uploadProgress" class="hidden mt-4">
                <div class="progress-bar">
                    <div class="progress-bar-fill" id="progressFill" style="width: 0%"></div>
                </div>
                <p class="text-sm text-gray-600 mt-2" id="progressText">Uploading...</p>
            </div>
            
            <div id="dataPreview" class="hidden mt-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">Data Preview</h4>
                <div class="overflow-x-auto">
                    <table class="data-preview-table" id="previewTable"></table>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        const uploadZone = this.container.querySelector('#uploadZone');
        const fileInput = this.container.querySelector('#fileInput');
        
        // Click to upload
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }
    
    async handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Show progress
        this.showProgress(0, 'Uploading file...');
        
        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.showProgress(percentComplete, 'Uploading file...');
                }
            };
            
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    this.showProgress(100, 'Processing complete!');
                    this.showPreview(response.preview);
                    
                    setTimeout(() => {
                        this.hideProgress();
                        this.onDatasetLoaded(response);
                    }, 1000);
                } else {
                    const error = JSON.parse(xhr.responseText);
                    throw new Error(error.error || 'Upload failed');
                }
            };
            
            xhr.onerror = () => {
                throw new Error('Network error during upload');
            };
            
            xhr.open('POST', `${this.apiBaseUrl}/upload`);
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.hideProgress();
            this.showError(error.message);
        }
    }
    
    showProgress(percent, text) {
        const progressContainer = this.container.querySelector('#uploadProgress');
        const progressFill = this.container.querySelector('#progressFill');
        const progressText = this.container.querySelector('#progressText');
        
        progressContainer.classList.remove('hidden');
        progressFill.style.width = `${percent}%`;
        progressText.textContent = text;
    }
    
    hideProgress() {
        const progressContainer = this.container.querySelector('#uploadProgress');
        progressContainer.classList.add('hidden');
    }
    
    showPreview(data) {
        const previewContainer = this.container.querySelector('#dataPreview');
        const table = this.container.querySelector('#previewTable');
        
        if (!data || data.length === 0) return;
        
        const columns = Object.keys(data[0]);
        const rows = data.slice(0, 5); // Show first 5 rows
        
        let html = '<thead><tr>';
        columns.forEach(col => {
            html += `<th>${col}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                html += `<td>${row[col] || ''}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';
        
        table.innerHTML = html;
        previewContainer.classList.remove('hidden');
    }
    
    showError(message) {
        // Show error notification
        if (window.app) {
            window.app.showNotification('Upload Error', message, 'error');
        }
    }
}
