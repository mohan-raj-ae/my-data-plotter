from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import os
import uuid
from datetime import datetime
import sqlite3
from werkzeug.utils import secure_filename
import io
import base64

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'data/uploads'
PROCESSED_FOLDER = 'data/processed'
DATABASE_PATH = 'data/aidp.db'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            filename TEXT NOT NULL,
            columns TEXT NOT NULL,
            row_count INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visualizations (
            id TEXT PRIMARY KEY,
            dataset_id TEXT,
            name TEXT NOT NULL,
            config TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dataset_id) REFERENCES datasets (id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            config TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# Utility functions
def detect_data_types(df):
    """Smart data type detection with suggestions"""
    column_info = {}
    
    for col in df.columns:
        sample_data = df[col].dropna().head(100)
        
        # Check if numeric
        numeric_count = sum(pd.to_numeric(sample_data, errors='coerce').notna())
        numeric_ratio = numeric_count / len(sample_data) if len(sample_data) > 0 else 0
        
        # Check if datetime
        datetime_count = 0
        try:
            pd.to_datetime(sample_data, errors='coerce', infer_datetime_format=True)
            datetime_count = sum(pd.to_datetime(sample_data, errors='coerce').notna())
        except:
            pass
        
        datetime_ratio = datetime_count / len(sample_data) if len(sample_data) > 0 else 0
        
        # Determine type and suggestions
        if numeric_ratio > 0.8:
            data_type = 'numeric'
            suggestions = ['y-axis', 'filter-range']
        elif datetime_ratio > 0.8:
            data_type = 'datetime'
            suggestions = ['x-axis', 'filter-date']
        else:
            data_type = 'categorical'
            unique_ratio = len(sample_data.unique()) / len(sample_data) if len(sample_data) > 0 else 0
            if unique_ratio < 0.1:
                suggestions = ['grouping', 'filter-category', 'color-coding']
            else:
                suggestions = ['x-axis', 'filter-category']
        
        column_info[col] = {
            'type': data_type,
            'suggestions': suggestions,
            'unique_count': len(sample_data.unique()) if len(sample_data) > 0 else 0,
            'null_count': df[col].isnull().sum(),
            'sample_values': sample_data.head(5).tolist()
        }
    
    return column_info

def generate_smart_suggestions(df, column_info):
    """Generate smart configuration suggestions based on data analysis"""
    suggestions = []
    
    numeric_cols = [col for col, info in column_info.items() if info['type'] == 'numeric']
    categorical_cols = [col for col, info in column_info.items() if info['type'] == 'categorical']
    datetime_cols = [col for col, info in column_info.items() if info['type'] == 'datetime']
    
    # Suggestion 1: Time series if datetime column exists
    if datetime_cols and numeric_cols:
        suggestions.append({
            'id': 'timeseries',
            'title': 'Time Series Analysis',
            'description': f'Plot {numeric_cols[0]} over time using {datetime_cols[0]}',
            'config': {
                'chartType': 'line',
                'xAxis': datetime_cols[0],
                'leftYAxes': [numeric_cols[0]],
                'rightYAxes': [],
                'grouping': categorical_cols[:1] if categorical_cols else []
            },
            'confidence': 0.9
        })
    
    # Suggestion 2: Comparison across categories
    if categorical_cols and numeric_cols:
        suggestions.append({
            'id': 'category_comparison',
            'title': 'Category Comparison',
            'description': f'Compare {numeric_cols[0]} across {categorical_cols[0]}',
            'config': {
                'chartType': 'box',
                'xAxis': categorical_cols[0],
                'leftYAxes': [numeric_cols[0]],
                'rightYAxes': [],
                'grouping': categorical_cols[1:2] if len(categorical_cols) > 1 else []
            },
            'confidence': 0.8
        })
    
    # Suggestion 3: Correlation analysis
    if len(numeric_cols) >= 2:
        suggestions.append({
            'id': 'correlation',
            'title': 'Correlation Analysis',
            'description': f'Analyze relationship between {numeric_cols[0]} and {numeric_cols[1]}',
            'config': {
                'chartType': 'scatter',
                'xAxis': numeric_cols[0],
                'leftYAxes': [numeric_cols[1]],
                'rightYAxes': [],
                'grouping': categorical_cols[:1] if categorical_cols else []
            },
            'confidence': 0.7
        })
    
    # Suggestion 4: Multi-metric dashboard
    if len(numeric_cols) >= 3:
        suggestions.append({
            'id': 'multi_metric',
            'title': 'Multi-Metric View',
            'description': f'Compare multiple metrics on dual axes',
            'config': {
                'chartType': 'line',
                'xAxis': datetime_cols[0] if datetime_cols else categorical_cols[0],
                'leftYAxes': numeric_cols[:2],
                'rightYAxes': numeric_cols[2:3],
                'grouping': []
            },
            'confidence': 0.6
        })
    
    return sorted(suggestions, key=lambda x: x['confidence'], reverse=True)

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Secure filename and save
        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        filepath = os.path.join(UPLOAD_FOLDER, f"{file_id}_{filename}")
        file.save(filepath)
        
        # Process the file
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            elif filename.endswith('.tsv'):
                df = pd.read_csv(filepath, sep='\t')
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(filepath)
            else:
                return jsonify({'error': 'Unsupported file format'}), 400
            
            # Clean column names
            df.columns = df.columns.str.strip()
            
            # Detect data types and generate suggestions
            column_info = detect_data_types(df)
            suggestions = generate_smart_suggestions(df, column_info)
            
            # Save to database
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO datasets (id, name, filename, columns, row_count)
                VALUES (?, ?, ?, ?, ?)
            ''', (file_id, filename, filename, json.dumps(list(df.columns)), len(df)))
            conn.commit()
            conn.close()
            
            # Save processed data
            processed_path = os.path.join(PROCESSED_FOLDER, f"{file_id}.json")
            df.to_json(processed_path, orient='records')
            
            return jsonify({
                'id': file_id,
                'filename': filename,
                'columns': list(df.columns),
                'rowCount': len(df),
                'columnInfo': column_info,
                'suggestions': suggestions,
                'preview': df.head(10).to_dict('records')
            })
            
        except Exception as e:
            os.remove(filepath)  # Clean up on error
            return jsonify({'error': f'Error processing file: {str(e)}'}), 400
            
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/datasets/<dataset_id>/data', methods=['GET'])
def get_dataset_data(dataset_id):
    try:
        processed_path = os.path.join(PROCESSED_FOLDER, f"{dataset_id}.json")
        if not os.path.exists(processed_path):
            return jsonify({'error': 'Dataset not found'}), 404
        
        with open(processed_path, 'r') as f:
            data = json.load(f)
        
        return jsonify({'data': data})
        
    except Exception as e:
        return jsonify({'error': f'Error loading dataset: {str(e)}'}), 500

@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, filename, row_count, created_at FROM datasets ORDER BY created_at DESC')
        datasets = []
        for row in cursor.fetchall():
            datasets.append({
                'id': row[0],
                'name': row[1],
                'filename': row[2],
                'rowCount': row[3],
                'createdAt': row[4]
            })
        conn.close()
        
        return jsonify({'datasets': datasets})
        
    except Exception as e:
        return jsonify({'error': f'Error listing datasets: {str(e)}'}), 500

@app.route('/api/analyze/statistics', methods=['POST'])
def analyze_statistics():
    try:
        data = request.json
        dataset_id = data.get('datasetId')
        columns = data.get('columns', [])
        
        processed_path = os.path.join(PROCESSED_FOLDER, f"{dataset_id}.json")
        if not os.path.exists(processed_path):
            return jsonify({'error': 'Dataset not found'}), 404
        
        df = pd.read_json(processed_path)
        
        stats = {}
        for col in columns:
            if col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    stats[col] = {
                        'count': int(df[col].count()),
                        'mean': float(df[col].mean()) if not df[col].empty else None,
                        'median': float(df[col].median()) if not df[col].empty else None,
                        'std': float(df[col].std()) if not df[col].empty else None,
                        'min': float(df[col].min()) if not df[col].empty else None,
                        'max': float(df[col].max()) if not df[col].empty else None,
                        'quartiles': df[col].quantile([0.25, 0.5, 0.75]).tolist() if not df[col].empty else []
                    }
                else:
                    value_counts = df[col].value_counts().head(10)
                    stats[col] = {
                        'count': int(df[col].count()),
                        'unique': int(df[col].nunique()),
                        'top_values': value_counts.to_dict()
                    }
        
        return jsonify({'statistics': stats})
        
    except Exception as e:
        return jsonify({'error': f'Error analyzing statistics: {str(e)}'}), 500

@app.route('/api/visualizations', methods=['POST'])
def save_visualization():
    try:
        data = request.json
        viz_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO visualizations (id, dataset_id, name, config)
            VALUES (?, ?, ?, ?)
        ''', (viz_id, data.get('datasetId'), data.get('name'), json.dumps(data.get('config'))))
        conn.commit()
        conn.close()
        
        return jsonify({'id': viz_id, 'message': 'Visualization saved successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Error saving visualization: {str(e)}'}), 500

@app.route('/api/visualizations', methods=['GET'])
def list_visualizations():
    try:
        dataset_id = request.args.get('datasetId')
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        if dataset_id:
            cursor.execute('''
                SELECT v.id, v.name, v.config, v.created_at, d.name as dataset_name
                FROM visualizations v
                JOIN datasets d ON v.dataset_id = d.id
                WHERE v.dataset_id = ?
                ORDER BY v.created_at DESC
            ''', (dataset_id,))
        else:
            cursor.execute('''
                SELECT v.id, v.name, v.config, v.created_at, d.name as dataset_name
                FROM visualizations v
                JOIN datasets d ON v.dataset_id = d.id
                ORDER BY v.created_at DESC
            ''')
        
        visualizations = []
        for row in cursor.fetchall():
            visualizations.append({
                'id': row[0],
                'name': row[1],
                'config': json.loads(row[2]),
                'createdAt': row[3],
                'datasetName': row[4]
            })
        
        conn.close()
        return jsonify({'visualizations': visualizations})
        
    except Exception as e:
        return jsonify({'error': f'Error listing visualizations: {str(e)}'}), 500

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get predefined visualization templates"""
    templates = [
        {
            'id': 'sales_dashboard',
            'name': 'Sales Dashboard',
            'description': 'Track sales metrics over time with multiple KPIs',
            'category': 'Business',
            'config': {
                'chartType': 'line',
                'showDataPoints': True,
                'customizations': {
                    'title': 'Sales Performance Dashboard',
                    'theme': 'professional'
                }
            }
        },
        {
            'id': 'scientific_analysis',
            'name': 'Scientific Analysis',
            'description': 'Statistical analysis with error bars and regression',
            'category': 'Science',
            'config': {
                'chartType': 'scatter',
                'showOutliers': True,
                'annotations': True,
                'customizations': {
                    'title': 'Scientific Data Analysis',
                    'theme': 'minimal'
                }
            }
        },
        {
            'id': 'comparison_study',
            'name': 'Comparison Study',
            'description': 'Compare multiple groups with box plots',
            'category': 'Analysis',
            'config': {
                'chartType': 'box',
                'showOutliers': True,
                'showDataPoints': True,
                'customizations': {
                    'title': 'Group Comparison Analysis',
                    'theme': 'colorful'
                }
            }
        }
    ]
    
    return jsonify({'templates': templates})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
