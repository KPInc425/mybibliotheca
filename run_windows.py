from app import create_app

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting BookOracle on Windows...")
    print("📖 Using Flask development server")
    print("🌐 Server will be available at: http://localhost:5054")
    print("⚠️  This is a development server - not suitable for production")
    print("🔧 For production on Windows, consider using Waitress or Hypercorn")
    print()
    
    # Run the Flask development server
    app.run(
        host='0.0.0.0',
        port=5054,
        debug=True,  # Enable debug mode for development
        use_reloader=True  # Auto-reload on code changes
    ) 