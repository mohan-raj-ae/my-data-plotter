// Main application controller
class AIDPApp {
    constructor() {
        this.apiBaseUrl = 'https://possessed-crypt-x5ggwwgj4rg9hpp6x-5000.app.github.dev/api';
        this.currentDataset = null;
        this.currentVisualization = null;
        this.plotTabs = [];
        this.activeTabId = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.initializeComponents();
        await this.loadTemplates();
        
        // Load sample data for demo
        this.loadSampleData();
    }
    
    setupEventListeners() {
        // Quick start buttons
        document.getElementById('quickUploadBtn').addEventListener('click', () => {
            document.querySelector('#dataUploadComponent input[type="file"]').click();
        });
        
        document.getElementById('browseTemplatesBtn').addEventListener('click', () => {
            this.showTemplatesModal();
        });
        
        // Modal controls
        document.getElementById('datasetManagerBtn').addEventListener('click', () => {
            this.showDatasetModal();
        });
        
        document.getElementById('templatesBtn').addEventListener('click', () => {
            this.showTemplatesModal();
        });
        
        // Plot configuration
        document.getElementById('addPlotTabBtn').addEventListener('click', () => {
            this.addPlotTab();
        });
        
        document.getElementById('configAssistantBtn').addEventListener('click', () => {
            this.showConfigAssistant();
        });
        
        // Actions
        document.getElementById('exportPlotBtn').addEventListener('click', () => {
            this.exportPlot();
        });
        
        document.getElementById('saveVisualizationBtn').addEventListener('click', () => {
            this.saveVisualization();
        });
        
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });
        
        // Configuration changes
        ['xAxisSelect', 'leftYAxisSelect', 'rightYAxisSelect', 'groupingSelect', 'chartTypeSelect'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updatePlot();
            });
        });
        
        ['showOutliersToggle', 'showDataPointsToggle'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updatePlot();
            });
        });
        
        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target);
            }
        });
    }
    
    initializeComponents() {
        // Initialize data upload component
        this.dataUpload = new DataUploadComponent(
            document.getElementById('dataUploadComponent'),
            this.apiBaseUrl,
            (dataset) => this.onDatasetLoaded(dataset)
        );
        
        // Initialize filter builder
        this.filterBuilder = new FilterBuilderComponent(
            document.getElementById('filterBuilderComponent'),
            () => this.updatePlot()
        );
        
        // Initialize config assistant (placeholder)
        this.configAssistant = {
            show: () => console.log('Config assistant not implemented yet')
        };
    }
    
    async loadTemplates() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/templates`);
            const data = await response.json();
            this.templates = data.templates;
        } catch (error) {
            console.error('Error loading templates:', error);
            this.showNotification('Error', 'Failed to load templates', 'error');
        }
    }
    
    loadSampleData() {
        // Load sample data for demonstration
        const sampleData = `Displacement,Pull Load (N),Temperature (C),Adhesive,Test Case
0.1,150,25,Fuller,RT
0.2,310,25,Fuller,RT
0.3,450,25,Fuller,RT
0.4,620,25,Fuller,RT
0.5,780,25,Fuller,RT
0.6,900,25,Fuller,RT
0.1,120,-40,Sika,Cold
0.2,250,-40,Sika,Cold
0.3,380,-40,Sika,Cold
0.4,510,-40,Sika,Cold
0.5,630,-40,Sika,Cold
0.6,740,-40,Sika,Cold
0.1,180,80,Dow,Hot
0.2,350,80,Dow,Hot
0.3,530,80,Dow,Hot
0.4,710,80,Dow,Hot
0.5,880,80,Dow,Hot
0.6,1050,80,Dow,Hot`;
        
        // Simulate file upload with sample data
        const blob = new Blob([sampleData], { type: 'text/csv' });
        const file = new File([blob], 'sample_data.csv', { type: 'text/csv' });
        this.dataUpload.handleFileUpload(file);
    }
    
    async onDatasetLoaded(dataset) {
        this.currentDataset = dataset;
        
        // Update UI
        document.getElementById('quickStartSection').classList.add('hidden');
        document.getElementById('suggestionsCard').classList.remove('hidden');
        document.getElementById('statisticsCard').classList.remove('hidden');
        
        // Populate selects
        this.populateColumnSelects(dataset.columns);
        
        // Show smart suggestions
        this.displaySmartSuggestions(dataset.suggestions);
        
        // Enable controls
        this.enableControls(true);
        
        // Initialize filter builder with columns
        this.filterBuilder.setColumns(dataset.columnInfo);
        
        // Load statistics
        await this.loadStatistics(dataset.id, dataset.columns);
        
        // Create first plot tab
        if (this.plotTabs.length === 0) {
            this.addPlotTab('Main Plot');
        }
        
        this.showNotification('Success', `Dataset loaded: ${dataset.rowCount} rows`, 'success');
    }
    
    populateColumnSelects(columns) {
        const selects = ['xAxisSelect', 'leftYAxisSelect', 'rightYAxisSelect', 'groupingSelect'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '';
            
            if (selectId === 'xAxisSelect') {
                select.innerHTML = '<option value="">Select column...</option>';
            }
            
            columns.forEach(col => {
                const option = document.createElement('option');
                option.value = col;
                option.textContent = col;
                select.appendChild(option);
            });
        });
    }
    
    displaySmartSuggestions(suggestions) {
        const container = document.getElementById('smartSuggestions');
        container.innerHTML = '';
        
        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No suggestions available</p>';
            return;
        }
        
        suggestions.forEach(suggestion => {
            const card = document.createElement('div');
            card.className = 'suggestion-card mb-3';
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-sm font-medium text-gray-900">${suggestion.title}</h4>
                    <span class="text-xs text-gray-500">${Math.round(suggestion.confidence * 100)}%</span>
                </div>
                <p class="text-xs text-gray-600 mb-2">${suggestion.description}</p>
                <button class="btn btn-primary text-xs px-2 py-1" onclick="app.applySuggestion('${suggestion.id}')">
                    Apply
                </button>
            `;
            container.appendChild(card);
        });
    }
    
    async loadStatistics(datasetId, columns) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/analyze/statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datasetId, columns })
            });
            
            const data = await response.json();
            this.displayStatistics(data.statistics);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
    
    displayStatistics(statistics) {
        const container = document.getElementById('statisticsContent');
        container.innerHTML = '';
        
        Object.entries(statistics).forEach(([column, stats]) => {
            const section = document.createElement('div');
            section.className = 'mb-4';
            
            let content = `<h4 class="text-sm font-medium text-gray-900 mb-2">${column}</h4>`;
            
            if (stats.mean !== undefined) {
                // Numeric statistics
                content += `
                    <div class="space-y-1 text-xs">
                        <div class="stat-item">
                            <span class="stat-label">Mean:</span>
                            <span class="stat-value">${stats.mean.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Median:</span>
                            <span class="stat-value">${stats.median.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Std Dev:</span>
                            <span class="stat-value">${stats.std.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Range:</span>
                            <span class="stat-value">${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            } else {
                // Categorical statistics
                content += `
                    <div class="space-y-1 text-xs">
                        <div class="stat-item">
                            <span class="stat-label">Unique:</span>
                            <span class="stat-value">${stats.unique}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Count:</span>
                            <span class="stat-value">${stats.count}</span>
                        </div>
                    </div>
                `;
                
                if (stats.top_values) {
                    content += '<div class="mt-2"><span class="text-xs font-medium text-gray-600">Top Values:</span>';
                    Object.entries(stats.top_values).slice(0, 3).forEach(([value, count]) => {
                        content += `<div class="text-xs text-gray-500">${value}: ${count}</div>`;
                    });
                    content += '</div>';
                }
            }
            
            section.innerHTML = content;
            container.appendChild(section);
        });
    }
    
    applySuggestion(suggestionId) {
        const suggestion = this.currentDataset.suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
            this.applyConfiguration(suggestion.config);
            this.showNotification('Applied', `Configuration "${suggestion.title}" applied`, 'success');
        }
    }
    
    applyConfiguration(config) {
        if (config.xAxis) {
            document.getElementById('xAxisSelect').value = config.xAxis;
        }
        
        if (config.leftYAxes) {
            const select = document.getElementById('leftYAxisSelect');
            Array.from(select.options).forEach(option => {
                option.selected = config.leftYAxes.includes(option.value);
            });
        }
        
        if (config.rightYAxes) {
            const select = document.getElementById('rightYAxisSelect');
            Array.from(select.options).forEach(option => {
                option.selected = config.rightYAxes.includes(option.value);
            });
        }
        
        if (config.grouping) {
            const select = document.getElementById('groupingSelect');
            Array.from(select.options).forEach(option => {
                option.selected = config.grouping.includes(option.value);
            });
        }
        
        if (config.chartType) {
            document.getElementById('chartTypeSelect').value = config.chartType;
        }
        
        this.updatePlot();
    }
    
    addPlotTab(name = null) {
        const tabId = Date.now().toString();
        const tabName = name || `Plot ${this.plotTabs.length + 1}`;
        
        this.plotTabs.push({
            id: tabId,
            name: tabName,
            config: this.getCurrentConfiguration()
        });
        
        this.renderTabs();
        this.activateTab(tabId);
    }
    
    renderTabs() {
        const container = document.getElementById('plotTabsContainer');
        container.innerHTML = '';
        
        if (this.plotTabs.length === 0) return;
        
        const tabList = document.createElement('div');
        tabList.className = 'tab-list';
        
        this.plotTabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = `tab ${tab.id === this.activeTabId ? 'active' : ''}`;
            tabElement.textContent = tab.name;
            tabElement.onclick = () => this.activateTab(tab.id);
            
            tabList.appendChild(tabElement);
        });
        
        container.appendChild(tabList);
    }
    
    activateTab(tabId) {
        this.activeTabId = tabId;
        const tab = this.plotTabs.find(t => t.id === tabId);
        
        if (tab && tab.config) {
            this.applyConfiguration(tab.config);
        }
        
        this.renderTabs();
        this.updatePlot();
    }
    
    getCurrentConfiguration() {
        return {
            xAxis: document.getElementById('xAxisSelect').value,
            leftYAxes: Array.from(document.getElementById('leftYAxisSelect').selectedOptions).map(o => o.value),
            rightYAxes: Array.from(document.getElementById('rightYAxisSelect').selectedOptions).map(o => o.value),
            grouping: Array.from(document.getElementById('groupingSelect').selectedOptions).map(o => o.value),
            chartType: document.getElementById('chartTypeSelect').value,
            showOutliers: document.getElementById('showOutliersToggle').checked,
            showDataPoints: document.getElementById('showDataPointsToggle').checked
        };
    }
    
    async updatePlot() {
        if (!this.currentDataset) return;
        
        const config = this.getCurrentConfiguration();
        
        // Update current tab config
        if (this.activeTabId) {
            const tab = this.plotTabs.find(t => t.id === this.activeTabId);
            if (tab) {
                tab.config = config;
            }
        }
        
        // Get filtered data
        const filters = this.filterBuilder.getFilters();
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/datasets/${this.currentDataset.id}/data`);
            const data = await response.json();
            
            // Apply filters
            let filteredData = this.applyFilters(data.data, filters);
            
            // Render plot
            this.plotRenderer = new PlotRenderer(document.getElementById('plotContainer'));
            await this.plotRenderer.render(filteredData, config);
            
        } catch (error) {
            console.error('Error updating plot:', error);
            this.showNotification('Error', 'Failed to update plot', 'error');
        }
    }
    
    applyFilters(data, filters) {
        // Apply filter logic here
        return data; // Simplified for now
    }
    
    enableControls(enabled) {
        const controls = [
            'xAxisSelect', 'leftYAxisSelect', 'rightYAxisSelect', 'groupingSelect',
            'chartTypeSelect', 'showOutliersToggle', 'showDataPointsToggle',
            'addPlotTabBtn', 'configAssistantBtn', 'exportPlotBtn', 'saveVisualizationBtn'
        ];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !enabled;
            }
        });
    }
    
    showConfigAssistant() {
        if (this.currentDataset) {
            this.configAssistant.show(this.currentDataset);
        }
    }
    
    async exportPlot() {
        if (this.plotRenderer) {
            await this.plotRenderer.exportAsPNG();
            this.showNotification('Success', 'Plot exported successfully', 'success');
        }
    }
    
    async saveVisualization() {
        if (!this.currentDataset) return;
        
        const name = prompt('Enter visualization name:');
        if (!name) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/visualizations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    datasetId: this.currentDataset.id,
                    name: name,
                    config: this.getCurrentConfiguration()
                })
            });
            
            const result = await response.json();
            this.showNotification('Success', 'Visualization saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving visualization:', error);
            this.showNotification('Error', 'Failed to save visualization', 'error');
        }
    }
    
    generateReport() {
        // Generate PDF report with current visualizations
        this.showNotification('Info', 'Report generation feature coming soon', 'info');
    }
    
    showDatasetModal() {
        const modal = document.getElementById('datasetModal');
        this.showModal(modal);
        this.loadDatasetList();
    }
    
    showTemplatesModal() {
        const modal = document.getElementById('templatesModal');
        this.showModal(modal);
        this.loadTemplatesList();
    }
    
    async loadDatasetList() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/datasets`);
            const data = await response.json();
            
            const container = document.getElementById('datasetList');
            container.innerHTML = '';
            
            if (data.datasets.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No datasets found</p>';
                return;
            }
            
            data.datasets.forEach(dataset => {
                const item = document.createElement('div');
                item.className = 'flex justify-between items-center p-3 border border-gray-200 rounded-lg mb-2';
                item.innerHTML = `
                    <div>
                        <h4 class="font-medium">${dataset.name}</h4>
                        <p class="text-sm text-gray-500">${dataset.rowCount} rows • ${dataset.createdAt}</p>
                    </div>
                    <button class="btn btn-primary" onclick="app.loadDataset('${dataset.id}')">
                        Load
                    </button>
                `;
                container.appendChild(item);
            });
            
        } catch (error) {
            console.error('Error loading datasets:', error);
        }
    }
    
    loadTemplatesList() {
        const container = document.getElementById('templatesList');
        container.innerHTML = '';
        
        if (!this.templates || this.templates.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No templates available</p>';
            return;
        }
        
        this.templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-card mb-3';
            item.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium">${template.name}</h4>
                    <span class="template-category">${template.category}</span>
                </div>
                <p class="text-sm text-gray-600 mb-3">${template.description}</p>
                <button class="btn btn-primary" onclick="app.applyTemplate('${template.id}')">
                    Apply Template
                </button>
            `;
            container.appendChild(item);
        });
    }
    
    applyTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (template && this.currentDataset) {
            this.applyConfiguration(template.config);
            this.hideModal(document.getElementById('templatesModal'));
            this.showNotification('Success', `Template "${template.name}" applied`, 'success');
        }
    }
    
    showModal(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
    }
    
    hideModal(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('fade-in');
    }
    
    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} slide-up`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <span class="text-lg">${icons[type]}</span>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${title}</p>
                        <p class="text-sm text-gray-500">${message}</p>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the application
const app = new AIDPApp();
