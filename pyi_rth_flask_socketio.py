"""
PyInstaller runtime hook for Flask-SocketIO
This ensures proper initialization of SocketIO in executables
"""
import sys

# Ensure threading driver is available before SocketIO tries to detect it
if getattr(sys, 'frozen', False):
    try:
        import engineio.async_drivers.threading
    except ImportError:
        pass

