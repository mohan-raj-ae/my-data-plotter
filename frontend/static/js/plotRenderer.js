class PlotRenderer {
    constructor(container) {
        this.container = container;
        this.plotlyDiv = null;
        this.currentPlot = null;
    }
    
    async render(data, config) {
        if (!data || data.length === 0) {
            this.showEmptyState('No data available for plotting');
            return;
        }
        
        if (!config.xAxis || (config.leftYAxes.length === 0 && config.rightYAxes.length === 0)) {
            this.showEmptyState('Please select X-axis and at least one Y-axis');
            return;
        }
        
        try {
            const { traces, layout } = this.buildPlotlyConfig(data, config);
            
            if (!this.plotlyDiv) {
                this.plotlyDiv = document.createElement('div');
                this.plotlyDiv.style.width = '100%';
                this.plotlyDiv.style.height = '600px';
                this.container.innerHTML = '';
                this.container.appendChild(this.plotlyDiv);
            }
            
            await Plotly.newPlot(this.plotlyDiv, traces, layout, {
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d']
            });
            
            this.currentPlot = { data: traces, layout: layout };
            
        } catch (error) {
            console.error('Error rendering plot:', error);
            this.showEmptyState('Error rendering plot: ' + error.message);
        }
    }
    
    buildPlotlyConfig(data, config) {
        const traces = [];
        const layout = {
            title: {
                text: this.generateTitle(config),
                font: { size: 18, family: 'Inter, sans-serif' }
            },
            xaxis: {
                title: { text: config.xAxis },
                tickangle: -45
            },
            margin: { t: 60, b: 120, l: 80, r: 80 },
            height: 600,
            showlegend: true,
            legend: {
                orientation: 'h',
                y: -0.2,
                x: 0.5,
                xanchor: 'center'
            }
        };
        
        // Process grouping
        const groups = this.groupData(data, config.grouping);
        
        // Process Y axes
        this.processYAxes(traces, layout, groups, config);
        
        return { traces, layout };
    }
    
    generateTitle(config) {
        const yAxes = [...config.leftYAxes, ...config.rightYAxes];
        return `${this.capitalize(config.chartType)} Plot: ${yAxes.join(', ')} vs ${config.xAxis}`;
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    groupData(data, groupingColumns) {
        if (!groupingColumns || groupingColumns.length === 0) {
            return { 'All Data': data };
        }
        
        const groups = {};
        data.forEach(row => {
            const groupKey = groupingColumns.map(col => row[col] || 'Unknown').join(' - ');
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(row);
        });
        
        return groups;
    }
    
    processYAxes(traces, layout, groups, config) {
        const colors = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ];
        
        let colorIndex = 0;
        
        // Process left Y axes
        config.leftYAxes.forEach((yColumn, yIndex) => {
            const yAxisId = yIndex === 0 ? 'y' : `y${yIndex + 1}`;
            
            if (yIndex > 0) {
                layout[`yaxis${yIndex + 1}`] = {
                    title: { text: yColumn },
                    overlaying: 'y',
                    side: 'left',
                    position: yIndex * 0.1
                };
            } else {
                layout.yaxis.title = { text: yColumn };
            }
            
            Object.entries(groups).forEach(([groupName, groupData]) => {
                const trace = this.createTrace(groupData, config.xAxis, yColumn, groupName, config, colors[colorIndex % colors.length]);
                trace.yaxis = yAxisId;
                traces.push(trace);
                colorIndex++;
            });
        });
        
        // Process right Y axes
        config.rightYAxes.forEach((yColumn, yIndex) => {
            const yAxisId = `y${config.leftYAxes.length + yIndex + 1}`;
            
            layout[`yaxis${config.leftYAxes.length + yIndex + 1}`] = {
                title: { text: yColumn },
                overlaying: 'y',
                side: 'right',
                position: 1 - (yIndex * 0.1)
            };
            
            Object.entries(groups).forEach(([groupName, groupData]) => {
                const trace = this.createTrace(groupData, config.xAxis, yColumn, groupName, config, colors[colorIndex % colors.length]);
                trace.yaxis = yAxisId;
                traces.push(trace);
                colorIndex++;
            });
        });
    }
    
    createTrace(data, xColumn, yColumn, groupName, config, color) {
        const xData = data.map(row => row[xColumn]);
        const yData = data.map(row => row[yColumn]);
        
        const baseName = config.grouping.length > 0 ? `${groupName} - ${yColumn}` : yColumn;
        
        const trace = {
            name: baseName,
            x: xData,
            y: yData,
            type: this.getPlotlyType(config.chartType),
            marker: { color: color }
        };
        
        // Chart type specific configurations
        switch (config.chartType) {
            case 'box':
                trace.boxpoints = config.showOutliers ? 'outliers' : false;
                if (config.showDataPoints) {
                    const validYData = yData.filter(y => y !== null && y !== undefined && !isNaN(y));
                    trace.name = `${baseName} (n=${validYData.length})`;
                }
                break;
                
            case 'violin':
                trace.box = { visible: true };
                trace.meanline = { visible: true };
                if (config.showDataPoints) {
                    const validYData = yData.filter(y => y !== null && y !== undefined && !isNaN(y));
                    trace.name = `${baseName} (n=${validYData.length})`;
                }
                break;
                
            case 'scatter':
                trace.mode = 'markers';
                trace.marker.size = 8;
                break;
                
            case 'line':
                trace.mode = 'lines+markers';
                trace.line = { width: 2 };
                trace.marker.size = 6;
                break;
                
            case 'bar':
                // For bar charts, we might need to aggregate data
                const aggregatedData = this.aggregateDataForBar(data, xColumn, yColumn);
                trace.x = aggregatedData.x;
                trace.y = aggregatedData.y;
                break;
        }
        
        return trace;
    }
    
    getPlotlyType(chartType) {
        const typeMap = {
            'box': 'box',
            'violin': 'violin',
            'scatter': 'scatter',
            'line': 'scatter',
            'bar': 'bar'
        };
        
        return typeMap[chartType] || 'scatter';
    }
    
    aggregateDataForBar(data, xColumn, yColumn) {
        const groups = {};
        
        data.forEach(row => {
            const xVal = row[xColumn];
            const yVal = parseFloat(row[yColumn]);
            
            if (!isNaN(yVal)) {
                if (!groups[xVal]) {
                    groups[xVal] = [];
                }
                groups[xVal].push(yVal);
            }
        });
        
        const x = Object.keys(groups).sort();
        const y = x.map(key => {
            const values = groups[key];
            return values.reduce((sum, val) => sum + val, 0) / values.length; // Average
        });
        
        return { x, y };
    }
    
    showEmptyState(message) {
        this.container.innerHTML = `
            <div class="flex items-center justify-center h-96 text-gray-500">
                <div class="text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    <p class="text-lg font-medium">${message}</p>
                </div>
            </div>
        `;
    }
    
    async exportAsPNG() {
        if (!this.plotlyDiv || !this.currentPlot) {
            throw new Error('No plot to export');
        }
        
        const filename = 'plot_export.png';
        await Plotly.downloadImage(this.plotlyDiv, {
            format: 'png',
            width: 1200,
            height: 800,
            filename: filename
        });
    }
}
