"""
Flask web application for the website crawler.
Provides a user-friendly web interface for crawling websites.
"""
import os
import json
import csv
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlparse
from flask import Flask, render_template, request, jsonify, send_file, session
from flask_socketio import SocketIO, emit
import uuid

from crawl import CrawlerRunner

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = 'output'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active crawls
active_crawls: Dict[str, dict] = {}


@app.route('/')
def index():
    """Main page with crawler form."""
    return render_template('index.html')


@app.route('/api/start-crawl', methods=['POST'])
def start_crawl():
    """Start a new crawl job."""
    data = request.json
    start_url = data.get('url', '').strip()
    max_depth = int(data.get('max_depth', 10))
    output_dir = data.get('output_dir', 'output')
    clear_cache = data.get('clear_cache', True)  # Clear cache by default
    
    if not start_url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Clear HTTP cache if requested
    if clear_cache:
        cache_dir = os.path.join('httpcache', urlparse(start_url).netloc.replace('.', '_'))
        if os.path.exists('httpcache'):
            try:
                import shutil
                # Clear cache for this domain
                if os.path.exists(cache_dir):
                    shutil.rmtree(cache_dir)
                # Or clear entire cache
                # shutil.rmtree('httpcache')
            except Exception as e:
                print(f"Warning: Could not clear cache: {e}")
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Create output directory for this job
    job_output_dir = os.path.join(output_dir, job_id)
    os.makedirs(job_output_dir, exist_ok=True)
    
    # Store crawl info
    active_crawls[job_id] = {
        'status': 'starting',
        'url': start_url,
        'max_depth': max_depth,
        'output_dir': job_output_dir,
        'progress': 0,
        'message': 'Initializing crawler...',
        'started_at': datetime.now().isoformat(),
        'pages_crawled': 0,
        'links_found': 0,
        'errors': []
    }
    
    # Start crawl in background thread
    thread = threading.Thread(
        target=run_crawl_async,
        args=(job_id, start_url, max_depth, job_output_dir),
        daemon=True
    )
    thread.start()
    
    return jsonify({
        'job_id': job_id,
        'status': 'started',
        'message': 'Crawl started successfully'
    })


def run_crawl_async(job_id: str, start_url: str, max_depth: int, output_dir: str):
    """Run crawl in background thread and emit progress updates."""
    try:
        # Update status
        active_crawls[job_id]['status'] = 'crawling'
        active_crawls[job_id]['message'] = 'Crawling website...'
        active_crawls[job_id]['progress'] = 10
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'crawling',
            'message': 'Crawling website...',
            'progress': 10
        })
        
        # Run crawler
        from crawl import CrawlerRunner
        runner = CrawlerRunner(
            start_url=start_url,
            max_depth=max_depth,
            output_dir=output_dir,
            use_subprocess=True
        )
        
        runner.run()
        
        # Update status
        active_crawls[job_id]['status'] = 'completed'
        active_crawls[job_id]['message'] = 'Crawl completed successfully!'
        active_crawls[job_id]['progress'] = 100
        active_crawls[job_id]['completed_at'] = datetime.now().isoformat()
        active_crawls[job_id]['pages_crawled'] = len(runner.crawled_items)
        active_crawls[job_id]['output_files'] = {
            'json': os.path.join(output_dir, 'report.json'),
            'csv': os.path.join(output_dir, 'summary.csv'),
            'sitemap': os.path.join(output_dir, 'sitemap.txt')
        }
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'completed',
            'message': 'Crawl completed successfully!',
            'progress': 100,
            'pages_crawled': len(runner.crawled_items),
            'links_found': len(runner.all_internal_links)
        })
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        
        active_crawls[job_id]['status'] = 'error'
        active_crawls[job_id]['message'] = f'Error: {error_msg}'
        if 'errors' not in active_crawls[job_id]:
            active_crawls[job_id]['errors'] = []
        active_crawls[job_id]['errors'].append(error_msg)
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'error',
            'message': f'Error: {error_msg}',
            'progress': 0
        })


@app.route('/api/crawl-status/<job_id>')
def get_crawl_status(job_id: str):
    """Get status of a crawl job."""
    # Debug logging (can be removed in production)
    if job_id not in active_crawls:
        print(f"Job {job_id} not in active_crawls. Active jobs: {list(active_crawls.keys())[:3]}")
    
    if job_id not in active_crawls:
        # Check if results exist (crawl might have completed before)
        json_path = os.path.join('output', job_id, 'report.json')
        if os.path.exists(json_path):
            return jsonify({
                'status': 'completed',
                'message': 'Crawl completed (results found)',
                'job_id': job_id,
                'progress': 100
            })
        
        # Also check default output location
        default_json_path = os.path.join('output', 'report.json')
        if os.path.exists(default_json_path):
            return jsonify({
                'status': 'completed',
                'message': 'Crawl completed (results found in default location)',
                'job_id': job_id,
                'progress': 100
            })
        
        # Return a status indicating job not found
        return jsonify({
            'status': 'not_found',
            'message': f'Job {job_id} not found. It may have been removed or never started properly.',
            'job_id': job_id,
            'error': True,
            'suggestion': 'Please try starting a new crawl.'
        })
    
    return jsonify(active_crawls[job_id])


@app.route('/api/crawl-results/<job_id>')
def get_crawl_results(job_id: str):
    """Get results of a completed crawl."""
    json_path = None
    
    # First, try to get path from active_crawls
    if job_id in active_crawls:
        crawl_info = active_crawls[job_id]
        if crawl_info['status'] != 'completed':
            return jsonify({'error': 'Crawl not completed yet'}), 400
        json_path = crawl_info.get('output_files', {}).get('json')
    
    # If not in active_crawls or path not found, try to find the file directly
    if not json_path or not os.path.exists(json_path):
        # Try different possible locations
        possible_paths = [
            os.path.join('output', job_id, 'report.json'),
            os.path.join('output', 'report.json'),  # Fallback to default output
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                json_path = path
                break
    
    # Load JSON report if found
    if json_path and os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                report_data = json.load(f)
            return jsonify(report_data)
        except json.JSONDecodeError as e:
            return jsonify({'error': f'Invalid JSON file: {str(e)}'}), 500
        except Exception as e:
            return jsonify({'error': f'Error reading results: {str(e)}'}), 500
    
    # If job_id is 'default', try the default output location
    if job_id == 'default':
        default_path = os.path.join('output', 'report.json')
        if os.path.exists(default_path):
            try:
                with open(default_path, 'r', encoding='utf-8') as f:
                    report_data = json.load(f)
                return jsonify(report_data)
            except Exception as e:
                return jsonify({'error': f'Error reading default results: {str(e)}'}), 500
    
    return jsonify({'error': 'Results not found. The crawl may not have completed or the results were deleted.'}), 404


@app.route('/api/download/<job_id>/<file_type>')
def download_file(job_id: str, file_type: str):
    """Download crawl results file."""
    file_path = None
    
    # First, try to get path from active_crawls
    if job_id in active_crawls:
        crawl_info = active_crawls[job_id]
        output_files = crawl_info.get('output_files', {})
        file_path = output_files.get(file_type)
    
    # If not in active_crawls or path not found, try to find the file directly
    if not file_path or not os.path.exists(file_path):
        # Map file types to filenames
        file_names = {
            'json': 'report.json',
            'csv': 'summary.csv',
            'sitemap': 'sitemap.txt'
        }
        
        filename = file_names.get(file_type)
        if not filename:
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Try different possible locations
        possible_paths = [
            os.path.join('output', job_id, filename),
            os.path.join('output', filename),  # Fallback to default output
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                file_path = path
                break
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(file_path, as_attachment=True)


@app.route('/results/<job_id>')
def results_page(job_id: str):
    """Display results page for a crawl job."""
    # Always render the page - let JavaScript handle missing results gracefully
    return render_template('results.html', job_id=job_id)


@app.route('/api/list-jobs')
def list_jobs():
    """List all available crawl jobs (results that exist)."""
    jobs = []
    
    # Check active crawls
    for job_id, crawl_info in active_crawls.items():
        jobs.append({
            'job_id': job_id,
            'url': crawl_info.get('url', ''),
            'status': crawl_info.get('status', 'unknown'),
            'started_at': crawl_info.get('started_at', ''),
            'pages_crawled': crawl_info.get('pages_crawled', 0)
        })
    
    # Also check for completed jobs in output directory
    output_dir = 'output'
    if os.path.exists(output_dir):
        for item in os.listdir(output_dir):
            item_path = os.path.join(output_dir, item)
            if os.path.isdir(item_path):
                # Check if it's a job directory with results
                json_path = os.path.join(item_path, 'report.json')
                if os.path.exists(json_path):
                    # Check if already in active_crawls
                    if not any(j['job_id'] == item for j in jobs):
                        try:
                            with open(json_path, 'r', encoding='utf-8') as f:
                                report_data = json.load(f)
                            jobs.append({
                                'job_id': item,
                                'url': report_data.get('pages', [{}])[0].get('url', '') if report_data.get('pages') else '',
                                'status': 'completed',
                                'started_at': report_data.get('crawl_date', ''),
                                'pages_crawled': report_data.get('total_pages', 0)
                            })
                        except:
                            pass
    
    return jsonify({'jobs': jobs})


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    emit('connected', {'message': 'Connected to crawler server'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    pass


if __name__ == '__main__':
    # Create output directory if it doesn't exist
    os.makedirs('output', exist_ok=True)
    
    # Run Flask app with SocketIO
    print("\n" + "="*60)
    print("Website Crawler - Web Interface")
    print("="*60)
    print("\nStarting server...")
    print("Open your browser and go to: http://localhost:5000")
    print("\nPress Ctrl+C to stop the server\n")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

