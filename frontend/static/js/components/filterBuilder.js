class FilterBuilderComponent {
    constructor(container, onFiltersChange) {
        this.container = container;
        this.onFiltersChange = onFiltersChange;
        this.columns = {};
        this.filters = [];
        this.init();
    }
    
    init() {
        this.render();
    }
    
    setColumns(columnInfo) {
        this.columns = columnInfo;
        this.render();
    }
    
    render() {
        if (Object.keys(this.columns).length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"></path>
                    </svg>
                    <p>Load data to create filters</p>
                </div>
            `;
            return;
        }
        
        this.container.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <h4 class="text-sm font-medium text-gray-900">Active Filters</h4>
                    <button id="addFilterBtn" class="btn btn-secondary text-xs px-2 py-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Add Filter
                    </button>
                </div>
                
                <div id="filtersContainer">
                    ${this.filters.length === 0 ? '<p class="text-sm text-gray-500">No filters applied</p>' : ''}
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.renderFilters();
    }
    
    setupEventListeners() {
        const addFilterBtn = this.container.querySelector('#addFilterBtn');
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', () => {
                this.addFilter();
            });
        }
    }
    
    addFilter() {
        const filterId = Date.now().toString();
        const firstColumn = Object.keys(this.columns)[0];
        
        this.filters.push({
            id: filterId,
            column: firstColumn,
            operator: 'equals',
            value: '',
            type: this.columns[firstColumn]?.type || 'categorical'
        });
        
        this.renderFilters();
    }
    
    renderFilters() {
        const container = this.container.querySelector('#filtersContainer');
        if (!container) return;
        
        if (this.filters.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No filters applied</p>';
            return;
        }
        
        container.innerHTML = '';
        
        this.filters.forEach((filter, index) => {
            const filterElement = this.createFilterElement(filter, index);
            container.appendChild(filterElement);
        });
    }
    
    createFilterElement(filter, index) {
        const div = document.createElement('div');
        div.className = 'filter-group';
        
        const columnOptions = Object.keys(this.columns).map(col => 
            `<option value="${col}" ${col === filter.column ? 'selected' : ''}>${col}</option>`
        ).join('');
        
        const operators = this.getOperatorsForType(filter.type);
        const operatorOptions = operators.map(op => 
            `<option value="${op.value}" ${op.value === filter.operator ? 'selected' : ''}>${op.label}</option>`
        ).join('');
        
        div.innerHTML = `
            <div class="flex items-center space-x-2 mb-2">
                <select class="form-select flex-1" data-filter-id="${filter.id}" data-field="column">
                    ${columnOptions}
                </select>
                <select class="form-select flex-1" data-filter-id="${filter.id}" data-field="operator">
                    ${operatorOptions}
                </select>
                <button class="btn btn-danger text-xs px-2 py-1" data-filter-id="${filter.id}" data-action="remove">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="filter-value-container">
                ${this.createValueInput(filter)}
            </div>
        `;
        
        // Add event listeners
        div.addEventListener('change', (e) => {
            this.handleFilterChange(e, filter);
        });
        
        div.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'remove') {
                this.removeFilter(filter.id);
            }
        });
        
        return div;
    }
    
    createValueInput(filter) {
        const column = this.columns[filter.column];
        if (!column) return '';
        
        if (filter.type === 'numeric') {
            if (filter.operator === 'between') {
                return `
                    <div class="flex space-x-2">
                        <input type="number" class="form-input flex-1" placeholder="Min" 
                               data-filter-id="${filter.id}" data-field="minValue" 
                               value="${filter.minValue || ''}">
                        <input type="number" class="form-input flex-1" placeholder="Max" 
                               data-filter-id="${filter.id}" data-field="maxValue" 
                               value="${filter.maxValue || ''}">
                    </div>
                `;
            } else {
                return `
                    <input type="number" class="form-input w-full" placeholder="Value" 
                           data-filter-id="${filter.id}" data-field="value" 
                           value="${filter.value || ''}">
                `;
            }
        } else if (filter.type === 'categorical') {
            if (filter.operator === 'in') {
                const options = column.sample_values.map(val => 
                    `<option value="${val}">${val}</option>`
                ).join('');
                return `
                    <select multiple class="form-select w-full" data-filter-id="${filter.id}" data-field="values">
                        ${options}
                    </select>
                `;
            } else {
                const options = column.sample_values.map(val => 
                    `<option value="${val}" ${val === filter.value ? 'selected' : ''}>${val}</option>`
                ).join('');
                return `
                    <select class="form-select w-full" data-filter-id="${filter.id}" data-field="value">
                        <option value="">Select value...</option>
                        ${options}
                    </select>
                `;
            }
        }
        
        return `
            <input type="text" class="form-input w-full" placeholder="Value" 
                   data-filter-id="${filter.id}" data-field="value" 
                   value="${filter.value || ''}">
        `;
    }
    
    getOperatorsForType(type) {
        if (type === 'numeric') {
            return [
                { value: 'equals', label: 'Equals' },
                { value: 'not_equals', label: 'Not Equals' },
                { value: 'greater_than', label: 'Greater Than' },
                { value: 'less_than', label: 'Less Than' },
                { value: 'greater_equal', label: 'Greater or Equal' },
                { value: 'less_equal', label: 'Less or Equal' },
                { value: 'between', label: 'Between' }
            ];
        } else {
            return [
                { value: 'equals', label: 'Equals' },
                { value: 'not_equals', label: 'Not Equals' },
                { value: 'contains', label: 'Contains' },
                { value: 'starts_with', label: 'Starts With' },
                { value: 'ends_with', label: 'Ends With' },
                { value: 'in', label: 'In List' }
            ];
        }
    }
    
    handleFilterChange(e, filter) {
        const field = e.target.dataset.field;
        const value = e.target.value;
        
        if (field === 'column') {
            filter.column = value;
            filter.type = this.columns[value]?.type || 'categorical';
            filter.operator = 'equals';
            filter.value = '';
            this.renderFilters();
        } else if (field === 'operator') {
            filter.operator = value;
            filter.value = '';
            this.renderFilters();
        } else {
            filter[field] = value;
        }
        
        this.onFiltersChange();
    }
    
    removeFilter(filterId) {
        this.filters = this.filters.filter(f => f.id !== filterId);
        this.renderFilters();
        this.onFiltersChange();
    }
    
    getFilters() {
        return this.filters;
    }
    
    clearFilters() {
        this.filters = [];
        this.renderFilters();
        this.onFiltersChange();
    }
}
