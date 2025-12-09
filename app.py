"""
Flask web application for the website crawler.
Provides a user-friendly web interface for crawling websites.
"""
import os
import json
import csv
import threading
import time
import io
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urlparse
from flask import Flask, render_template, request, jsonify, send_file, session
from flask_socketio import SocketIO, emit
import uuid
import sys

from crawl import CrawlerRunner

app = Flask(__name__)

# Detect if running as executable and pre-load threading driver
if getattr(sys, 'frozen', False):
    # Running as PyInstaller executable - pre-import threading driver
    try:
        import engineio.async_drivers.threading
    except ImportError:
        pass
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

# Detect if running on Vercel (serverless environment)
IS_VERCEL = os.environ.get('VERCEL', '0') == '1' or os.environ.get('VERCEL_ENV') is not None

# Use /tmp for Vercel (writable), or 'output' for local development
if IS_VERCEL:
    OUTPUT_BASE_DIR = '/tmp/output'
else:
    OUTPUT_BASE_DIR = 'output'

app.config['UPLOAD_FOLDER'] = OUTPUT_BASE_DIR

# Ensure output directory exists
os.makedirs(OUTPUT_BASE_DIR, exist_ok=True)
# Store keyword research jobs and progress
keyword_research_jobs = {}
keyword_research_lock = threading.Lock()

# Configure SocketIO for Vercel (serverless-friendly)
# Make SocketIO optional - app will work without real-time updates if SocketIO fails
is_executable = getattr(sys, 'frozen', False)
socketio = None
socketio_available = False

# Try to initialize SocketIO - if it fails, app continues without real-time features
try:
    if is_executable:
        # Pre-load threading driver for executables
        try:
            import engineio.async_drivers.threading
        except ImportError:
            pass
        
        # Try threading mode for executables
        try:
            socketio = SocketIO(
                app, 
                cors_allowed_origins="*",
                async_mode='threading',
                logger=False,
                engineio_logger=False
            )
            socketio_available = True
        except (ValueError, Exception):
            # Threading mode failed, try without specifying mode
            try:
                socketio = SocketIO(
                    app, 
                    cors_allowed_origins="*",
                    logger=False,
                    engineio_logger=False
                )
                socketio_available = True
            except Exception:
                pass
    else:
        # Development mode - try auto-detection
        socketio = SocketIO(
            app, 
            cors_allowed_origins="*",
            logger=False,
            engineio_logger=False
        )
        socketio_available = True
except Exception as e:
    print(f"Warning: SocketIO initialization failed: {e}")
    print("App will continue without real-time progress updates.")
    print("Progress can still be checked via status polling.")

# Create dummy SocketIO object if initialization failed
if socketio is None:
    class DummySocketIO:
        """Dummy SocketIO object when real SocketIO is unavailable."""
        def emit(self, event, data=None, room=None, namespace=None, callback=None, **kwargs):
            """Silently ignore emit calls when SocketIO is unavailable."""
            pass
        
        def run(self, app, debug=False, host='0.0.0.0', port=5000, **kwargs):
            """Fallback to regular Flask run when SocketIO is unavailable."""
            app.run(debug=debug, host=host, port=port, **kwargs)
    
    socketio = DummySocketIO()
    socketio_available = False
    print("Using fallback mode - real-time updates disabled.")

# Store active crawls (in-memory, but also persisted to disk for Vercel)
active_crawls: Dict[str, dict] = {}

def get_job_status_file(job_id: str) -> str:
    """Get path to job status file."""
    base_output = app.config['UPLOAD_FOLDER']
    job_dir = os.path.join(base_output, job_id)
    os.makedirs(job_dir, exist_ok=True)
    return os.path.join(job_dir, 'status.json')

def save_job_status(job_id: str, status_data: dict):
    """Save job status to disk (for Vercel serverless persistence)."""
    try:
        status_file = get_job_status_file(job_id)
        with open(status_file, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save job status: {e}")

def load_job_status(job_id: str) -> Optional[dict]:
    """Load job status from disk."""
    try:
        status_file = get_job_status_file(job_id)
        if os.path.exists(status_file):
            with open(status_file, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load job status: {e}")
    return None

# Hardcoded credentials
VALID_USERNAME = 'kashi'
VALID_PASSWORD = 'Blackhat@123'

# Add error handlers to ensure JSON responses (important for Vercel)
@app.errorhandler(404)
def not_found(error):
    """Return JSON for 404 errors."""
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Return JSON for 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    """Return JSON for any unhandled exceptions."""
    return jsonify({'error': f'An error occurred: {str(e)}'}), 500


def login_required(f):
    """Decorator to require login for routes."""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    """Handle user login."""
    try:
        # Accept both JSON and form data
        if request.is_json:
            data = request.get_json() or {}
        else:
            data = request.form.to_dict() or {}
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username and password are required'
            }), 400
        
        if username == VALID_USERNAME and password == VALID_PASSWORD:
            session['authenticated'] = True
            session['username'] = username
            session.permanent = True  # Make session persistent
            return jsonify({
                'success': True,
                'message': 'Login successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Login error: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle user logout."""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated."""
    if session.get('authenticated'):
        return jsonify({
            'authenticated': True,
            'username': session.get('username')
        })
    return jsonify({'authenticated': False}), 200  # Return 200, not 401, so frontend can handle it

@app.route('/')
def index():
    """Main page with crawler form."""
    return render_template('index.html')


@app.route('/api/start-crawl', methods=['POST'])
@login_required
def start_crawl():
    """Start a new crawl job."""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        data = request.get_json() or {}
        start_url = data.get('url', '').strip()
        max_depth = int(data.get('max_depth', 10))
        clear_cache = data.get('clear_cache', True)  # Clear cache by default
        
        if not start_url:
            return jsonify({'error': 'URL is required'}), 400
    except Exception as e:
        return jsonify({'error': f'Invalid request: {str(e)}'}), 400
    
    # Auto-fix URL (add https:// if missing)
    if not start_url.startswith(('http://', 'https://')):
        start_url = 'https://' + start_url
    
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
    
    # Use the configured output base directory
    base_output_dir = app.config['UPLOAD_FOLDER']
    
    # Create output directory for this job
    job_output_dir = os.path.join(base_output_dir, job_id)
    os.makedirs(job_output_dir, exist_ok=True)
    
    # Store crawl info
    crawl_info = {
        'status': 'starting',
        'url': start_url,
        'max_depth': max_depth,
        'output_dir': job_output_dir,
        'progress': 0,
        'message': 'Initializing crawler...',
        'started_at': datetime.now().isoformat(),
        'pages_crawled': 0,
        'links_found': 0,
        'internal_links': 0,
        'external_links': 0,
        'current_page': '',
        'errors': []
    }
    active_crawls[job_id] = crawl_info
    save_job_status(job_id, crawl_info)  # Persist to disk for Vercel
    
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


def run_crawl_async(job_id: str, start_url: str, max_depth: int, job_output_dir: str):
    """Run crawl in background thread and emit progress updates."""
    try:
        # Update status - Initializing
        active_crawls[job_id]['status'] = 'initializing'
        active_crawls[job_id]['message'] = 'Initializing crawler...'
        active_crawls[job_id]['progress'] = 5
        save_job_status(job_id, active_crawls[job_id])  # Persist to disk
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'initializing',
            'message': 'Initializing crawler...',
            'progress': 5
        })
        
        import time
        time.sleep(0.5)  # Brief delay to show initialization
        
        # Update status - Starting crawl
        active_crawls[job_id]['status'] = 'crawling'
        active_crawls[job_id]['message'] = 'Starting to crawl website...'
        active_crawls[job_id]['progress'] = 10
        save_job_status(job_id, active_crawls[job_id])  # Persist to disk
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'crawling',
            'message': 'Starting to crawl website...',
            'progress': 10
        })
        
        # Run crawler in subprocess with progress tracking
        from crawl import CrawlerRunner
        
        # Track progress by monitoring output directory
        progress_file = os.path.join(job_output_dir, 'progress.json')
        
        runner = CrawlerRunner(
            start_url=start_url,
            max_depth=max_depth,
            output_dir=job_output_dir,  # Use job-specific directory
            use_subprocess=True,
            progress_file=progress_file,
            job_id=job_id
        )
        
        # Start progress monitoring thread
        def monitor_progress():
            last_pages = 0
            max_iterations = 3600  # Max 1 hour
            iteration = 0
            start_time = time.time()
            last_update_time = start_time
            
            while active_crawls[job_id]['status'] in ['crawling', 'initializing', 'processing'] and iteration < max_iterations:
                try:
                    current_time = time.time()
                    elapsed_time = current_time - start_time
                    
                    # Check if progress file exists and read it
                    if os.path.exists(progress_file):
                        with open(progress_file, 'r') as f:
                            progress_data = json.load(f)
                            pages = progress_data.get('pages_crawled', 0)
                            links = progress_data.get('links_found', 0)
                            
                            if pages > last_pages or pages > 0 or iteration == 0:
                                # Get discovered URLs from progress file for real-time progress
                                discovered_urls = progress_data.get('discovered_urls', 0)
                                
                                # Calculate progress: 10-60% for crawling phase
                                # Use discovered URLs if available, otherwise estimate
                                if discovered_urls > 0 and discovered_urls >= pages:
                                    # Real progress based on discovered URLs
                                    crawl_progress = min(60, 10 + (pages / discovered_urls) * 50)
                                else:
                                    # Fallback: use a more dynamic estimation
                                    # Estimate based on pages found, but allow it to grow
                                    # Use a logarithmic approach that shows progress even when total is unknown
                                    if pages <= 5:
                                        crawl_progress = 10 + (pages * 3)  # 10-25% for first 5 pages
                                    elif pages <= 20:
                                        crawl_progress = 25 + ((pages - 5) * 1.5)  # 25-47.5% for next 15 pages
                                    else:
                                        # For more pages, use a slower growth rate
                                        crawl_progress = min(60, 47.5 + ((pages - 20) * 0.5))  # 47.5-60% for remaining
                                
                                # Get additional stats from progress file
                                internal_links = progress_data.get('internal_links', 0)
                                external_links = progress_data.get('external_links', 0)
                                current_page = progress_data.get('current_page', '')
                                
                                # Calculate additional metrics
                                pages_delta = pages - last_pages
                                time_delta = current_time - last_update_time if last_update_time > 0 else 1
                                pages_per_second = pages_delta / time_delta if time_delta > 0 else 0
                                
                                # Calculate averages
                                avg_links_per_page = (internal_links + external_links) / pages if pages > 0 else 0
                                avg_internal_per_page = internal_links / pages if pages > 0 else 0
                                
                                # Estimate time remaining
                                remaining_pages = max(0, discovered_urls - pages) if discovered_urls > pages else 0
                                if pages_per_second > 0 and remaining_pages > 0:
                                    estimated_seconds_remaining = remaining_pages / pages_per_second
                                    if estimated_seconds_remaining < 60:
                                        time_remaining_str = f"{int(estimated_seconds_remaining)}s"
                                    elif estimated_seconds_remaining < 3600:
                                        time_remaining_str = f"{int(estimated_seconds_remaining / 60)}m {int(estimated_seconds_remaining % 60)}s"
                                    else:
                                        hours = int(estimated_seconds_remaining / 3600)
                                        mins = int((estimated_seconds_remaining % 3600) / 60)
                                        time_remaining_str = f"{hours}h {mins}m"
                                else:
                                    time_remaining_str = "Calculating..."
                                
                                # Format elapsed time
                                if elapsed_time < 60:
                                    elapsed_time_str = f"{int(elapsed_time)}s"
                                elif elapsed_time < 3600:
                                    elapsed_time_str = f"{int(elapsed_time / 60)}m {int(elapsed_time % 60)}s"
                                else:
                                    hours = int(elapsed_time / 3600)
                                    mins = int((elapsed_time % 3600) / 60)
                                    elapsed_time_str = f"{hours}h {mins}m"
                                
                                active_crawls[job_id]['pages_crawled'] = pages
                                active_crawls[job_id]['links_found'] = links
                                active_crawls[job_id]['internal_links'] = internal_links
                                active_crawls[job_id]['external_links'] = external_links
                                active_crawls[job_id]['current_page'] = current_page
                                active_crawls[job_id]['progress'] = int(crawl_progress)
                                
                                # Create detailed message
                                message = f'Crawling... Found {pages} pages'
                                if discovered_urls > pages:
                                    message += f' of ~{discovered_urls} discovered'
                                
                                # Persist to disk
                                save_job_status(job_id, active_crawls[job_id])
                                
                                socketio.emit('progress', {
                                    'job_id': job_id,
                                    'status': 'crawling',
                                    'message': message,
                                    'progress': int(crawl_progress),
                                    'pages_crawled': pages,
                                    'links_found': links,
                                    'internal_links': internal_links,
                                    'external_links': external_links,
                                    'current_page': current_page,
                                    'discovered_urls': discovered_urls,
                                    'pages_per_second': round(pages_per_second, 2),
                                    'avg_links_per_page': round(avg_links_per_page, 1),
                                    'avg_internal_per_page': round(avg_internal_per_page, 1),
                                    'elapsed_time': elapsed_time_str,
                                    'estimated_time_remaining': time_remaining_str
                                })
                                
                                last_pages = pages
                                last_update_time = current_time
                except Exception as e:
                    pass
                iteration += 1
                time.sleep(1)  # Check every second
        
        monitor_thread = threading.Thread(target=monitor_progress, daemon=True)
        monitor_thread.start()
        
        # Run the crawl
        runner.run()
        
        # Update status - Processing
        active_crawls[job_id]['status'] = 'processing'
        active_crawls[job_id]['message'] = 'Processing results and checking links...'
        active_crawls[job_id]['progress'] = 70
        save_job_status(job_id, active_crawls[job_id])  # Persist to disk
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Processing results and checking links...',
            'progress': 70
        })
        
        time.sleep(0.5)
        
        # Update status - Generating reports
        active_crawls[job_id]['status'] = 'generating'
        active_crawls[job_id]['message'] = 'Generating reports...'
        active_crawls[job_id]['progress'] = 90
        save_job_status(job_id, active_crawls[job_id])  # Persist to disk
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'generating',
            'message': 'Generating reports...',
            'progress': 90
        })
        
        # Update status - Completed
        active_crawls[job_id]['status'] = 'completed'
        active_crawls[job_id]['message'] = 'Crawl completed successfully!'
        active_crawls[job_id]['progress'] = 100
        active_crawls[job_id]['completed_at'] = datetime.now().isoformat()
        active_crawls[job_id]['pages_crawled'] = len(runner.crawled_items)
        active_crawls[job_id]['links_found'] = len(runner.all_internal_links)
        # Store output files paths
        active_crawls[job_id]['output_files'] = {
            'json': os.path.join(job_output_dir, 'report.json'),
            'csv': os.path.join(job_output_dir, 'summary.csv'),
            'sitemap': os.path.join(job_output_dir, 'sitemap.txt')
        }
        active_crawls[job_id]['output_dir'] = job_output_dir  # Store for reference
        save_job_status(job_id, active_crawls[job_id])  # Persist to disk
        
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
        save_job_status(job_id, active_crawls[job_id])  # Persist to disk
        
        socketio.emit('progress', {
            'job_id': job_id,
            'status': 'error',
            'message': f'Error: {error_msg}',
            'progress': 0
        })


@app.route('/api/crawl-status/<job_id>')
def get_crawl_status(job_id: str):
    """Get status of a crawl job."""
    try:
        # Debug logging (can be removed in production)
        if job_id not in active_crawls:
            print(f"Job {job_id} not in active_crawls. Active jobs: {list(active_crawls.keys())[:3]}")
        
        if job_id not in active_crawls:
            # Try to load from disk (for Vercel serverless persistence)
            saved_status = load_job_status(job_id)
            if saved_status:
                # Restore to active_crawls for this request
                active_crawls[job_id] = saved_status
            else:
                # Check if results exist (crawl might have completed before)
                base_output = app.config['UPLOAD_FOLDER']
                json_path = os.path.join(base_output, job_id, 'report.json')
                if os.path.exists(json_path):
                    return jsonify({
                        'status': 'completed',
                        'message': 'Crawl completed (results found)',
                        'job_id': job_id,
                        'progress': 100
                    })
                
                # Also check default output location
                default_json_path = os.path.join(base_output, 'report.json')
                if os.path.exists(default_json_path):
                    return jsonify({
                        'status': 'completed',
                        'message': 'Crawl completed (results found in default location)',
                        'job_id': job_id,
                        'progress': 100
                    })
                
                # Check if progress file exists (crawl might be in progress)
                progress_file = os.path.join(base_output, job_id, 'progress.json')
                if os.path.exists(progress_file):
                    try:
                        with open(progress_file, 'r') as f:
                            progress_data = json.load(f)
                        pages = progress_data.get('pages_crawled', 0)
                        links = progress_data.get('links_found', 0)
                        return jsonify({
                            'status': 'crawling',
                            'message': f'Crawling... Found {pages} pages, {links} links',
                            'job_id': job_id,
                            'progress': min(60, 10 + (pages / max(20, pages * 2)) * 50),
                            'pages_crawled': pages,
                            'links_found': links
                        })
                    except:
                        pass
                
                # Return a status indicating job not found
                return jsonify({
                    'status': 'not_found',
                    'message': f'Job {job_id} not found. It may have been removed or never started properly.',
                    'job_id': job_id,
                    'error': True,
                    'suggestion': 'Please try starting a new crawl.'
                })
        
        # Return current status
        crawl_info = active_crawls[job_id]
        return jsonify({
            'job_id': job_id,
            'status': crawl_info.get('status', 'unknown'),
            'progress': crawl_info.get('progress', 0),
            'message': crawl_info.get('message', ''),
            'pages_crawled': crawl_info.get('pages_crawled', 0),
            'links_found': crawl_info.get('links_found', 0),
            'internal_links': crawl_info.get('internal_links', 0),
            'external_links': crawl_info.get('external_links', 0),
            'current_page': crawl_info.get('current_page', '')
        })
    except Exception as e:
        return jsonify({
            'error': f'Error getting crawl status: {str(e)}',
            'job_id': job_id
        }), 500


@app.route('/api/crawl-results/<job_id>')
@login_required
def get_crawl_results(job_id: str):
    """Get results of a completed crawl."""
    try:
        json_path = None
        
        # First, try to get path from active_crawls
        if job_id in active_crawls:
            crawl_info = active_crawls[job_id]
            if crawl_info['status'] != 'completed':
                return jsonify({'error': 'Crawl not completed yet'}), 400
            json_path = crawl_info.get('output_files', {}).get('json')
        
        # If not in active_crawls or path not found, try to find the file directly
        base_output = app.config['UPLOAD_FOLDER']
        if not json_path or not os.path.exists(json_path):
            # Try different possible locations
            possible_paths = [
                os.path.join(base_output, job_id, 'report.json'),
                os.path.join(base_output, 'report.json'),  # Fallback to default output
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
            default_path = os.path.join(base_output, 'report.json')
            if os.path.exists(default_path):
                try:
                    with open(default_path, 'r', encoding='utf-8') as f:
                        report_data = json.load(f)
                    return jsonify(report_data)
                except Exception as e:
                    return jsonify({'error': f'Error reading default results: {str(e)}'}), 500
        
        return jsonify({'error': 'Results not found. The crawl may not have completed or the results were deleted.'}), 404
    except Exception as e:
        return jsonify({'error': f'Error loading results: {str(e)}'}), 500


@app.route('/api/download/<job_id>/<file_type>')
@login_required
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
        base_output = app.config['UPLOAD_FOLDER']
        possible_paths = [
            os.path.join(base_output, job_id, filename),
            os.path.join(base_output, filename),  # Fallback to default output
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                file_path = path
                break
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(file_path, as_attachment=True)


@app.route('/results/<job_id>')
@login_required
def results_page(job_id: str):
    """Display results page for a crawl job."""
    # Always render the page - let JavaScript handle missing results gracefully
    return render_template('results.html', job_id=job_id)


@app.route('/api/analyze-competitors', methods=['POST'])
@login_required
def analyze_competitors():
    """Analyze and compare two competitor URLs."""
    try:
        data = request.get_json()
        url1 = data.get('url1', '').strip()
        url2 = data.get('url2', '').strip()
        
        if not url1 or not url2:
            return jsonify({'error': 'Both URLs are required'}), 400
        
        # Validate URLs
        try:
            from urllib.parse import urlparse
            parsed1 = urlparse(url1)
            parsed2 = urlparse(url2)
            if not parsed1.scheme or not parsed1.netloc:
                url1 = 'https://' + url1
            if not parsed2.scheme or not parsed2.netloc:
                url2 = 'https://' + url2
        except:
            return jsonify({'error': 'Invalid URL format'}), 400
        
        # Try enhanced analyzer first (default)
        try:
            from enhanced_competitor_analyzer import EnhancedCompetitorAnalyzer
            # Get PageSpeed API key from environment if available
            pagespeed_api_key = os.environ.get('PAGESPEED_API_KEY', None)
            analyzer = EnhancedCompetitorAnalyzer(pagespeed_api_key=pagespeed_api_key)
            results = analyzer.analyze_competitors_enhanced(url1, url2, analyze_domain=True)
            
            # Merge base analysis into results for backward compatibility
            if results.get('base_analysis'):
                base = results['base_analysis']
                results['your_site'] = base.get('your_site', {})
                results['competitor'] = base.get('competitor', {})
                results['comparison'] = base.get('comparison', {})
                results['winner'] = base.get('winner', {})
                results['insights'] = base.get('insights', [])
                results['recommendations'] = base.get('recommendations', [])
                results['advantage_score'] = base.get('advantage_score', {})
            
            return jsonify(results)
        except ImportError:
            # Fallback to advanced analyzer
            try:
                from advanced_competitor_analyzer import AdvancedCompetitorAnalyzer
                # Get PageSpeed API key from environment if available
                pagespeed_api_key = os.environ.get('PAGESPEED_API_KEY', None)
                analyzer = AdvancedCompetitorAnalyzer(pagespeed_api_key=pagespeed_api_key)
                results = analyzer.analyze_competitors(url1, url2)
                return jsonify(results)
            except ImportError:
                # Fallback to basic analyzer
                try:
                    from competitor_analyzer import CompetitorAnalyzer
                    analyzer = CompetitorAnalyzer()
                    results = analyzer.analyze_competitors(url1, url2)
                    return jsonify(results)
                except ImportError:
                    return jsonify({'error': 'Competitor analyzer not available'}), 500
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error: {str(e)}'}), 500


@app.route('/api/keyword-research', methods=['POST'])
@login_required
def keyword_research():
    """Start keyword research analysis (async with progress tracking)."""
    try:
        data = request.get_json()
        domain = data.get('domain', '').strip()
        competitors_str = data.get('competitors', '').strip()
        
        if not domain:
            return jsonify({'error': 'Domain is required'}), 400
        
        if not competitors_str:
            return jsonify({'error': 'At least one competitor URL is required'}), 400
        
        # Parse competitors (comma-separated or newline-separated)
        competitors = [c.strip() for c in competitors_str.replace('\n', ',').split(',') if c.strip()]
        
        if not competitors:
            return jsonify({'error': 'At least one competitor URL is required'}), 400
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job progress
        with keyword_research_lock:
            keyword_research_jobs[job_id] = {
                'status': 'starting',
                'progress': 0,
                'stage': 'Initializing analysis...',
                'current_competitor': None,
                'competitor_index': 0,
                'total_competitors': len(competitors),
                'details': [],
                'results': None,
                'error': None,
                'started_at': datetime.now().isoformat()
            }
        
        # Start analysis in background thread
        def run_analysis():
            try:
                from keyword_research_analyzer import KeywordResearchAnalyzer
                analyzer = KeywordResearchAnalyzer()
                
                # Update progress callback
                def update_progress(progress, stage, details=None, current_competitor=None, competitor_index=0):
                    with keyword_research_lock:
                        if job_id in keyword_research_jobs:
                            # Only update progress if not None (None means don't change overall progress)
                            if progress is not None:
                                keyword_research_jobs[job_id]['progress'] = progress
                            keyword_research_jobs[job_id]['stage'] = stage
                            if current_competitor:
                                keyword_research_jobs[job_id]['current_competitor'] = current_competitor
                            if competitor_index is not None:
                                keyword_research_jobs[job_id]['competitor_index'] = competitor_index
                            if details:
                                keyword_research_jobs[job_id]['details'].append({
                                    'time': datetime.now().isoformat(),
                                    'message': details
                                })
                                # Keep only last 50 details to avoid memory issues
                                if len(keyword_research_jobs[job_id]['details']) > 50:
                                    keyword_research_jobs[job_id]['details'] = keyword_research_jobs[job_id]['details'][-50:]
                
                # Run analysis with progress updates
                results = analyzer.analyze_keywords_with_progress(domain, competitors, update_progress)
                
                # Save results to JSON files
                try:
                    results_dir = os.path.join('results', 'keyword_research')
                    os.makedirs(results_dir, exist_ok=True)
                    
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    
                    keywords_file = os.path.join(results_dir, f'keywords_{timestamp}.json')
                    with open(keywords_file, 'w', encoding='utf-8') as f:
                        json.dump({
                            'your_keywords': results['your_keywords'],
                            'competitor_keywords': results['competitor_keywords']
                        }, f, indent=2, ensure_ascii=False)
                    
                    topic_file = os.path.join(results_dir, f'topic_clusters_{timestamp}.json')
                    with open(topic_file, 'w', encoding='utf-8') as f:
                        json.dump({'topic_clusters': results['topic_clusters']}, f, indent=2, ensure_ascii=False)
                    
                    gaps_file = os.path.join(results_dir, f'content_gaps_{timestamp}.json')
                    with open(gaps_file, 'w', encoding='utf-8') as f:
                        json.dump({'content_gaps': results['content_gaps']}, f, indent=2, ensure_ascii=False)
                    
                    results['files_saved'] = {
                        'keywords': keywords_file,
                        'topic_clusters': topic_file,
                        'content_gaps': gaps_file
                    }
                except Exception as e:
                    print(f"Error saving files: {e}")
                
                # Mark as completed
                with keyword_research_lock:
                    keyword_research_jobs[job_id]['status'] = 'completed'
                    keyword_research_jobs[job_id]['progress'] = 100
                    keyword_research_jobs[job_id]['stage'] = 'Analysis complete!'
                    keyword_research_jobs[job_id]['results'] = results
                    keyword_research_jobs[job_id]['completed_at'] = datetime.now().isoformat()
            
            except Exception as e:
                import traceback
                traceback.print_exc()
                with keyword_research_lock:
                    keyword_research_jobs[job_id]['status'] = 'error'
                    keyword_research_jobs[job_id]['error'] = str(e)
                    keyword_research_jobs[job_id]['stage'] = f'Error: {str(e)}'
        
        # Start background thread
        thread = threading.Thread(target=run_analysis, daemon=True)
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'started',
            'message': 'Analysis started. Use /api/keyword-research-status/<job_id> to check progress.'
        })
    
    except Exception as e:
        return jsonify({'error': f'Error: {str(e)}'}), 500


@app.route('/api/keyword-research-status/<job_id>', methods=['GET'])
@login_required
def keyword_research_status(job_id):
    """Get keyword research analysis progress."""
    with keyword_research_lock:
        if job_id not in keyword_research_jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job_data = keyword_research_jobs[job_id].copy()
        
        # Don't send full results in status endpoint (too large)
        if job_data.get('results'):
            job_data['has_results'] = True
            # Only include summary in status
            if 'results' in job_data:
                results = job_data['results']
                job_data['results_summary'] = {
                    'statistics': results.get('statistics', {}),
                    'domain': results.get('domain'),
                    'competitors': results.get('competitors', [])
                }
        
        return jsonify(job_data)


@app.route('/api/keyword-research-results/<job_id>', methods=['GET'])
@login_required
def keyword_research_results(job_id):
    """Get full keyword research results."""
    with keyword_research_lock:
        if job_id not in keyword_research_jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job_data = keyword_research_jobs[job_id]
        
        if job_data['status'] != 'completed':
            return jsonify({'error': 'Analysis not completed yet'}), 400
        
        if not job_data.get('results'):
            return jsonify({'error': 'Results not available'}), 404
        
        return jsonify(job_data['results'])


@app.route('/api/keyword-search', methods=['POST'])
@login_required
def keyword_search():
    """Search for a specific keyword across competitor sites."""
    try:
        data = request.get_json()
        keyword = data.get('keyword', '').strip()
        competitors_str = data.get('competitors', '').strip()
        
        if not keyword:
            return jsonify({'error': 'Keyword is required'}), 400
        
        if not competitors_str:
            return jsonify({'error': 'At least one competitor URL is required'}), 400
        
        # Parse competitors (comma-separated or newline-separated)
        competitors = [c.strip() for c in competitors_str.replace('\n', ',').split(',') if c.strip()]
        
        if not competitors:
            return jsonify({'error': 'At least one competitor URL is required'}), 400
        
        # Run keyword search
        from keyword_research_analyzer import KeywordResearchAnalyzer
        analyzer = KeywordResearchAnalyzer()
        
        def progress_callback(progress, message):
            # Optional: Could use SocketIO for real-time updates
            pass
        
        results = analyzer.search_keyword_across_competitors(keyword, competitors, progress_callback)
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': f'Error: {str(e)}'}), 500


@app.route('/api/schema-analysis/<job_id>')
@login_required
def get_schema_analysis(job_id: str):
    """Analyze schema markup from crawl results."""
    try:
        # Load crawl results
        json_path = None
        base_output = app.config['UPLOAD_FOLDER']
        
        # Try to find the JSON report
        possible_paths = [
            os.path.join(base_output, job_id, 'report.json'),
            os.path.join(base_output, 'report.json'),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                json_path = path
                break
        
        if not json_path or not os.path.exists(json_path):
            return jsonify({'error': 'Crawl results not found. Please run a crawl first.'}), 404
        
        # Load crawl data
        with open(json_path, 'r', encoding='utf-8') as f:
            crawl_data = json.load(f)
        
        # Check if crawl data has pages
        if not crawl_data.get('pages'):
            return jsonify({'error': 'No pages found in crawl results. Please run a crawl first.'}), 400
        
        # Analyze schemas
        try:
            from schema_analyzer import SchemaAnalyzer
            analyzer = SchemaAnalyzer()
            analysis_results = analyzer.analyze_crawl_results(crawl_data)
            
            return jsonify(analysis_results)
        except ImportError as e:
            return jsonify({'error': f'Schema analyzer module not found: {str(e)}'}), 500
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Error analyzing schemas: {str(e)}'}), 500
        
    except FileNotFoundError:
        return jsonify({'error': 'Crawl results file not found. Please run a crawl first.'}), 404
    except json.JSONDecodeError as e:
        return jsonify({'error': f'Invalid JSON in crawl results: {str(e)}'}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error loading crawl results: {str(e)}'}), 500


@app.route('/api/export-competitor-analysis', methods=['POST'])
@login_required
def export_competitor_analysis():
    """Export competitor analysis to CSV/JSON/TXT"""
    try:
        data = request.get_json()
        analysis_data = data.get('data')
        export_format = data.get('format', 'csv')  # csv, json, txt
        
        if not analysis_data:
            return jsonify({'error': 'Analysis data is required'}), 400
        
        from export_utils import ExportUtils
        
        if export_format == 'csv':
            csv_content = ExportUtils.export_to_csv(analysis_data)
            return send_file(
                io.BytesIO(csv_content.encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'competitor_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )
        elif export_format == 'json':
            json_content = ExportUtils.export_to_json(analysis_data, pretty=True)
            return send_file(
                io.BytesIO(json_content.encode('utf-8')),
                mimetype='application/json',
                as_attachment=True,
                download_name=f'competitor_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            )
        elif export_format == 'txt':
            txt_content = ExportUtils.generate_summary_report(analysis_data)
            return send_file(
                io.BytesIO(txt_content.encode('utf-8')),
                mimetype='text/plain',
                as_attachment=True,
                download_name=f'competitor_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
            )
        else:
            return jsonify({'error': 'Invalid format. Use csv, json, or txt'}), 400
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Export failed: {str(e)}'}), 500


@app.route('/api/list-jobs')
def list_jobs():
    """List all available crawl jobs from the last 24 hours only - saved crawl history."""
    jobs = []
    seen_job_ids = set()
    
    # Calculate 24 hours ago
    now = datetime.now()
    twenty_four_hours_ago = now - timedelta(hours=24)
    
    def parse_datetime(date_str):
        """Parse datetime string in various formats."""
        if not date_str:
            return None
        try:
            # Try ISO format first
            if 'T' in date_str:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                # Convert to naive datetime for comparison
                if dt.tzinfo:
                    dt = dt.replace(tzinfo=None)
                return dt
            # Try common formats
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M:%S.%f',
                '%Y-%m-%d',
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
        except Exception:
            pass
        return None
    
    def is_within_24_hours(job_date_str):
        """Check if job date is within the last 24 hours."""
        if not job_date_str:
            return False
        job_date = parse_datetime(job_date_str)
        if job_date:
            return job_date >= twenty_four_hours_ago
        return False
    
    # Check active crawls
    for job_id, crawl_info in active_crawls.items():
        seen_job_ids.add(job_id)
        started_at = crawl_info.get('started_at', '')
        # Include active crawls (they're recent by definition) or if within 24 hours
        if crawl_info.get('status') in ['crawling', 'starting'] or is_within_24_hours(started_at):
            jobs.append({
                'job_id': job_id,
                'url': crawl_info.get('url', ''),
                'status': crawl_info.get('status', 'unknown'),
                'started_at': started_at,
                'completed_at': crawl_info.get('completed_at', ''),
                'pages_crawled': crawl_info.get('pages_crawled', 0),
                'links_found': crawl_info.get('links_found', 0),
                'site_seo_score': None  # Will be loaded from report if available
            })
    
    # Also check for completed jobs in output directory (saved crawl history)
    output_dir = app.config['UPLOAD_FOLDER']
    if os.path.exists(output_dir):
        for item in os.listdir(output_dir):
            if item in seen_job_ids:
                continue
                
            item_path = os.path.join(output_dir, item)
            if os.path.isdir(item_path):
                # Check if it's a job directory with results
                json_path = os.path.join(item_path, 'report.json')
                if os.path.exists(json_path):
                    try:
                        with open(json_path, 'r', encoding='utf-8') as f:
                            report_data = json.load(f)
                        
                        crawl_date = report_data.get('crawl_date', '')
                        
                        # Only include jobs from the last 24 hours
                        if not is_within_24_hours(crawl_date):
                            continue
                        
                        # Get first page URL as site URL
                        site_url = ''
                        if report_data.get('pages'):
                            first_page = report_data['pages'][0]
                            site_url = first_page.get('url', '')
                            # Extract domain from URL
                            if site_url:
                                from urllib.parse import urlparse
                                parsed = urlparse(site_url)
                                site_url = f"{parsed.scheme}://{parsed.netloc}"
                        
                        job_info = {
                            'job_id': item,
                            'url': site_url,
                            'status': 'completed',
                            'started_at': crawl_date,
                            'completed_at': crawl_date,
                            'pages_crawled': report_data.get('total_pages', 0),
                            'links_found': len(report_data.get('pages', [{}])[0].get('internal_links', [])) if report_data.get('pages') else 0,
                            'site_seo_score': report_data.get('site_seo_score', {}).get('score') if report_data.get('site_seo_score') else None
                        }
                        
                        # Try to get more detailed stats
                        if report_data.get('pages'):
                            total_links = sum(len(p.get('internal_links', [])) for p in report_data['pages'])
                            job_info['links_found'] = total_links
                        
                        jobs.append(job_info)
                    except Exception as e:
                        print(f"Error loading job {item}: {e}")
                        pass
    
    # Sort by started_at (most recent first)
    jobs.sort(key=lambda x: parse_datetime(x.get('started_at', '')) or datetime.min, reverse=True)
    
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
    # Output directory is already created in app initialization
    import sys
    
    # Detect if running as executable
    is_executable = getattr(sys, 'frozen', False)
    
    # Run Flask app with SocketIO
    print("\n" + "="*60)
    print("Website Crawler - Web Interface")
    print("="*60)
    print("\nStarting server...")
    print("Open your browser and go to: http://localhost:5000")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        # Use debug=False for executable, True for development
        if socketio_available:
            socketio.run(app, debug=not is_executable, host='0.0.0.0', port=5000)
        else:
            # Fallback to regular Flask run if SocketIO is unavailable
            app.run(debug=not is_executable, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"\nERROR: Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        if is_executable:
            print("\nPress Enter to exit...")
            input()
        sys.exit(1)

