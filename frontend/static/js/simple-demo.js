// Simple demo data loader
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        loadDemoData();
    }, 2000);
});

function loadDemoData() {
    // Sample data
    const sampleData = [
        {Displacement: 0.1, "Pull Load (N)": 150, "Temperature (C)": 25, Adhesive: "Fuller", "Test Case": "RT"},
        {Displacement: 0.2, "Pull Load (N)": 310, "Temperature (C)": 25, Adhesive: "Fuller", "Test Case": "RT"},
        {Displacement: 0.3, "Pull Load (N)": 450, "Temperature (C)": 25, Adhesive: "Fuller", "Test Case": "RT"},
        {Displacement: 0.4, "Pull Load (N)": 620, "Temperature (C)": 25, Adhesive: "Fuller", "Test Case": "RT"},
        {Displacement: 0.5, "Pull Load (N)": 780, "Temperature (C)": 25, Adhesive: "Fuller", "Test Case": "RT"},
        {Displacement: 0.6, "Pull Load (N)": 900, "Temperature (C)": 25, Adhesive: "Fuller", "Test Case": "RT"},
        {Displacement: 0.1, "Pull Load (N)": 120, "Temperature (C)": -40, Adhesive: "Sika", "Test Case": "Cold"},
        {Displacement: 0.2, "Pull Load (N)": 250, "Temperature (C)": -40, Adhesive: "Sika", "Test Case": "Cold"},
        {Displacement: 0.3, "Pull Load (N)": 380, "Temperature (C)": -40, Adhesive: "Sika", "Test Case": "Cold"},
        {Displacement: 0.4, "Pull Load (N)": 510, "Temperature (C)": -40, Adhesive: "Sika", "Test Case": "Cold"},
        {Displacement: 0.5, "Pull Load (N)": 630, "Temperature (C)": -40, Adhesive: "Sika", "Test Case": "Cold"},
        {Displacement: 0.6, "Pull Load (N)": 740, "Temperature (C)": -40, Adhesive: "Sika", "Test Case": "Cold"}
    ];

    // Simulate successful data load
    const mockDataset = {
        id: 'demo-data',
        filename: 'sample_data.csv',
        columns: ['Displacement', 'Pull Load (N)', 'Temperature (C)', 'Adhesive', 'Test Case'],
        rowCount: sampleData.length,
        columnInfo: {
            'Displacement': { type: 'numeric', suggestions: ['x-axis'] },
            'Pull Load (N)': { type: 'numeric', suggestions: ['y-axis'] },
            'Temperature (C)': { type: 'numeric', suggestions: ['y-axis'] },
            'Adhesive': { type: 'categorical', suggestions: ['grouping'] },
            'Test Case': { type: 'categorical', suggestions: ['grouping'] }
        },
        suggestions: [
            {
                id: 'demo1',
                title: 'Load vs Displacement',
                description: 'Plot Pull Load against Displacement',
                config: {
                    chartType: 'scatter',
                    xAxis: 'Displacement',
                    leftYAxes: ['Pull Load (N)'],
                    rightYAxes: [],
                    grouping: ['Adhesive']
                },
                confidence: 0.9
            }
        ],
        preview: sampleData.slice(0, 5),
        data: sampleData
    };

    // Trigger the data loaded event
    if (window.app) {
        window.app.onDatasetLoaded(mockDataset);
    } else {
        // If app isn't ready, try again
        setTimeout(() => loadDemoData(), 1000);
    }
}
