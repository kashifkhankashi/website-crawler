# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for creating executable from Flask app.
This file configures how PyInstaller bundles the application.
"""

block_cipher = None

# Collect all data files that need to be included
added_files = [
    ('templates', 'templates'),  # Include templates directory
    ('static', 'static'),  # Include static files (CSS, JS)
    ('scrapy.cfg', '.'),  # Scrapy configuration
    ('crawler', 'crawler'),  # Include crawler package
]

# Hidden imports - modules that PyInstaller might not detect automatically
hiddenimports = [
    'flask',
    'flask_socketio',
    'socketio',
    'socketio.server',
    'engineio',
    'engineio.async_drivers',
    'engineio.async_drivers.threading',
    'engineio.async_drivers.threading_thread',
    'engineio.server',
    'engineio.middleware',
    'scrapy',
    'scrapy.crawler',
    'scrapy.utils.project',
    'scrapy.http',
    'scrapy.spiders',
    'scrapy.exporters',
    'twisted',
    'twisted.internet',
    'twisted.web',
    'twisted.python',
    'zope.interface',
    'lxml',
    'lxml.html',
    'lxml.etree',
    'bs4',
    'beautifulsoup4',
    'PIL',
    'PIL.Image',
    'requests',
    'urllib3',
    'textdistance',
    'nltk',
    'spacy',
    'yake',
    'rake_nltk',
    'playwright',
    'crawl',
    'crawler',
    'crawler.items',
    'crawler.spiders',
    'crawler.spiders.site_spider',
    'crawler.pipelines',
    'crawler.middlewares',
    'crawler.settings',
    'accessibility_analyzer',
    'advanced_competitor_analyzer',
    'advanced_seo_analyzer',
    'competitor_analyzer',
    'comprehensive_competitor_analyzer',
    'content_analyzer',
    'dom_analyzer',
    'duplicate_content_analyzer',
    'enhanced_competitor_analyzer',
    'export_utils',
    'keyword_research_analyzer',
    'keyword_research_analyzer_advanced',
    'link_analyzer',
    'page_power_analyzer',
    'pagespeed_analyzer',
    'performance_analyzer',
    'seo_scorer',
    'visual_analyzer',
    'uuid',
    'threading',
    'json',
    'csv',
    'datetime',
    'typing',
]

a = Analysis(
    ['app.py'],  # Main entry point
    pathex=[],
    binaries=[],
    datas=added_files,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['pyi_rth_flask_socketio.py'],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='WebsiteCrawler',  # Name of the executable
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Set to False to hide console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # You can add an icon file path here if you have one
)

