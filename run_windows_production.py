from app import create_app
from waitress import serve
import os

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting MyBibliotheca on Windows (Production Mode)...")
    print("📖 Using Waitress WSGI server")
    print("🌐 Server will be available at: http://localhost:5054")
    print("⚡ Waitress is production-ready and Windows-compatible")
    print()
    
    # Get number of workers from environment or use default
    workers = int(os.environ.get('WORKERS', 4))
    
    # Run the Waitress server
    serve(
        app,
        host='0.0.0.0',
        port=5054,
        threads=workers,
        url_scheme='http'
    ) 