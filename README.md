# 📚 BookOracle

**BookOracle** is a self-hosted personal library and reading-tracker—your open-source alternative to Goodreads, StoryGraph, and Fable! It lets you log, organize, and visualize your reading journey. Add books by ISBN, track reading progress, log daily reading, and generate monthly wrap-up images of your finished titles.

🆕 **Multi-User Features**: Multi-user authentication, user data isolation, admin management, and secure password handling.

🆕 **Modern React Frontend**: Complete React frontend with full feature parity to the legacy Flask app, featuring modern UI/UX, responsive design, and React Native readiness.

[![Documentation](https://img.shields.io/badge/Documentation-BookOracle-4a90e2?style=for-the-badge&logo=read-the-docs&logoColor=white)](https://bookoracle.org)

[![Discord](https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white&labelColor=7289DA&style=for-the-badge)](https://discord.gg/Hc8C5eRm7Q)

---

## ✨ Features

- 📖 **Add Books**: Add books quickly by ISBN with automatic cover and metadata fetching. Now featuring bulk-import from Goodreads and other CSV files! 
- ✅ **Track Progress**: Mark books as *Currently Reading*, *Want to Read*, *Finished*, or *Library Only*.
- 📅 **Reading Logs**: Log daily reading activity and maintain streaks.
- 🖼️ **Monthly Wrap-Ups**: Generate shareable image collages of books completed each month.
- 🔎 **Search**: Find and import books using the Google Books API.
- 📱 **Responsive UI**: Clean, mobile-friendly interface built with React and Tailwind CSS.
- 🔐 **Multi-User Support**: Secure authentication with user data isolation
- 👤 **Admin Management**: Administrative tools and user management
- 📱 **Smart Barcode Scanner**: Intelligent scanner that automatically chooses between native MLKit (Android) and browser-based scanning with seamless fallback
- 🎨 **Modern Frontend**: React 18 + TypeScript + Tailwind CSS with full feature parity

---

## 🖼️ Preview

![App Preview](https://i.imgur.com/AkiBN68.png)  
![Library](https://i.imgur.com/h9iR9ql.png)

---

## 🏗️ Architecture

BookOracle now features a **hybrid architecture** with both legacy and modern frontends:

### **Backend (Flask)**
- **Framework**: Flask 2.2.2 with SQLAlchemy ORM
- **Database**: SQLite with automatic migrations
- **Authentication**: Flask-Login with session management
- **API**: Complete REST API for frontend integration

### **Frontend Options**

#### **🆕 Modern React Frontend (Recommended)**
- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS + DaisyUI
- **Build Tool**: Vite
- **Features**: Full feature parity with enhanced UX

#### **Legacy Template Frontend**
- **Templating**: Jinja2 with server-side rendering
- **Styling**: Tailwind CSS + DaisyUI
- **Mobile**: Capacitor for native mobile app

---

## 🚀 Getting Started

### 📦 Run with Docker (Recommended)

BookOracle can be run completely in Docker — no need to install Python or dependencies on your machine.

#### ✅ Prerequisites

- [Docker](https://www.docker.com/) installed
- [Docker Compose](https://docs.docker.com/compose/) installed

---

#### 🔁 Option 1: One-liner (Docker only)

```bash
docker run -d \
  --name bookoracle \
  -p 5054:5054 \
  -v /path/to/data:/app/data \
  -e TIMEZONE=America/Chicago \
  -e WORKERS=6 \
  --restart unless-stopped \
  pickles4evaaaa/bookoracle:1.1.1
```

---

#### 🔁 Option 2: Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  BookOracle:
    image: pickles4evaaaa/bookoracle:1.1.1
    container_name: bookoracle
    ports:
      - "5054:5054"
    volumes:
      - /path/to/data:/app/data      # ← bind-mount host
    restart: unless-stopped
    environment:
      - TIMEZONE=America/Chicago  # ✅ Set your preferred timezone here
      - WORKERS=6  # Change to the number of Gunicorn workers you want
```

Then run:

```bash
docker compose up -d
```

### 🔧 Configurable Environment Variables

| Variable              | Description                                | Default / Example         |
|-----------------------|--------------------------------------------|---------------------------|
| `SECRET_KEY`          | Flask secret key for sessions             | `auto-generated`          |
| `SECURITY_PASSWORD_SALT` | Password hashing salt               | `auto-generated`          |
| `TIMEZONE`            | Sets the app's timezone                    | `America/Chicago`         |
| `WORKERS`             | Number of Gunicorn worker processes        | `6`                      |

---

## 🎨 Frontend Options

### **🆕 Modern React Frontend (Default)**

The React frontend provides a modern, responsive experience with full feature parity:

**Features:**
- ✅ Complete feature parity with legacy app
- ✅ Modern React 18 + TypeScript
- ✅ Responsive design with mobile-first approach
- ✅ Enhanced user experience with client-side state management
- ✅ React Native ready for future mobile development
- ✅ Barcode scanner with intelligent native/browser fallback
- ✅ User preferences (HeroIcons vs Emojis)
- ✅ Advanced filtering and search
- ✅ Mass edit functionality
- ✅ Complete admin panel

**Access:** Visit `http://localhost:5054` - the React frontend is now the default interface.

### **Legacy Template Frontend**

The original Flask template-based frontend is still available:

**Access:** Visit `http://localhost:5054/legacy` for the original interface.

---

## 🔐 Authentication & User Management

### First Time Setup

When you first run BookOracle, you'll be prompted to complete a one-time setup:

1. **Access the application** at `http://localhost:5054` (or your configured port)
2. **Complete the setup form** to create your administrator account:
   - Choose an admin username
   - Provide an admin email address  
   - Set a secure password (must meet security requirements)
3. **Start using BookOracle** - you'll be automatically logged in after setup

✅ **Secure by Design**: No default credentials - you control your admin account from the start!

### Password Security

- **Strong password requirements**: All passwords must meet security criteria
- **Automatic password changes**: New users are prompted to change their password on first login
- **Secure password storage**: All passwords are hashed using industry-standard methods

### Admin Tools

Use the built-in admin tools for password management:

```bash
# Reset admin password (interactive)
docker exec -it bookoracle-bookoracle-1 python3 admin_tools.py reset-admin-password

# Create additional admin user
docker exec -it bookoracle-bookoracle-1 python3 admin_tools.py create-admin

# List all users
docker exec -it bookoracle-bookoracle-1 python3 admin_tools.py list-users

# System statistics
docker exec -it bookoracle-bookoracle-1 python3 admin_tools.py system-stats
```

### Migration from V1.x

Existing single-user installations are **automatically migrated** to multi-user:
- **Automatic database backup** created before migration
- All existing books are assigned to an admin user (created via setup)
- No data is lost during migration
- V1.x functionality remains unchanged
- **Setup required** if no admin user exists after migration

📖 **Documentation:**
- **[MIGRATION.md](MIGRATION.md)** - Automatic migration system details
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Complete authentication guide
- **[ADMIN_TOOLS.md](ADMIN_TOOLS.md)** - Admin tools and user management
- **[TESTING.md](TESTING.md)** - Comprehensive testing documentation and procedures
- **[NATIVE_BARCODE_SCANNER.md](NATIVE_BARCODE_SCANNER.md)** - Native Android barcode scanner implementation guide
- **[FRONTEND_MIGRATION_SUMMARY.md](FRONTEND_MIGRATION_SUMMARY.md)** - Complete React frontend migration summary

---

### 🐍 Install from Source (Manual Setup)

#### ✅ Prerequisites

* Python 3.8+
* `pip`
* Node.js 18+ (for React frontend development)

---

### 🔧 Manual Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/pickles4evaaaa/bookoracle.git
   cd bookoracle
   ```

2. **Create a Python virtual environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Setup data directory** (ensures parity with Docker environment)

   **On Linux/macOS:**
   ```bash
   python3 setup_data_dir.py
   ```

   **On Windows:**
   ```cmd
   # Option 1: Use Python script (recommended)
   python setup_data_dir.py
   
   # Option 2: Use Windows batch script
   setup_data_dir.bat
   ```

   This step creates the `data` directory and database file with proper permissions for your platform.

5. **Run the backend**

   **On Linux/macOS:**
   ```bash
   gunicorn -w NUMBER_OF_WORKERS -b 0.0.0.0:5054 run:app
   ```

   **On Windows:**
   ```cmd
   # If gunicorn is installed globally
   gunicorn -w NUMBER_OF_WORKERS -b 0.0.0.0:5054 run:app
   
   # Or use Python module (more reliable on Windows)
   python -m gunicorn -w NUMBER_OF_WORKERS -b 0.0.0.0:5054 run:app
   ```

6. **Run the React frontend (Optional)**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The React frontend will be available at `http://localhost:3001` and will proxy API requests to the backend at `http://localhost:5054`.

Visit: [http://127.0.0.1:5054](http://127.0.0.1:5054) for the main application

> 💡 No need to manually set up the database — it is created automatically on first run.

---

### ⚙️ Configuration

* By default, uses SQLite (`books.db`) and a simple dev secret key.
* For production, you can configure:

  * `SECRET_KEY`
  * `DATABASE_URI`
    via environment variables or `.env`.

---

## 🚀 Production Deployment

### Quick Production Setup

1. **Clone and configure**:
```bash
git clone https://github.com/your-username/bookoracle.git
cd bookoracle
cp .env.example .env
```

2. **Generate secure keys**:
```bash
# Generate SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))" >> .env

# Generate SECURITY_PASSWORD_SALT  
python3 -c "import secrets; print('SECURITY_PASSWORD_SALT=' + secrets.token_urlsafe(32))" >> .env
```

3. **Customize configuration** (edit `.env`):
```bash
# Set your timezone
TIMEZONE=America/Chicago

# Adjust workers based on your server
WORKERS=4
```

4. **Deploy**:
```bash
docker compose up -d
```

5. **Complete setup**: Visit your application and create your admin account through the setup page

### Production Security Checklist

- ✅ **Environment Variables**: Use `.env` file with secure random keys
- ✅ **HTTPS**: Deploy behind reverse proxy with SSL/TLS (nginx, Traefik, etc.)
- ✅ **Firewall**: Restrict access to necessary ports only
- ✅ **Backups**: Implement regular database backups
- ✅ **Updates**: Keep Docker images and host system updated
- ✅ **Monitoring**: Set up health checks and log monitoring

### Development Setup

For development and testing, use the development compose file:

```bash
# Development with live code reloading
docker compose -f docker-compose.dev.yml up -d

# Run tests
docker compose -f docker-compose.dev.yml --profile test up bookoracle-test
```

---

## 🗂️ Project Structure

```
BookOracle/
├── app/                    # Flask backend
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── api.py             # REST API endpoints
│   ├── utils.py
│   └── templates/         # Legacy templates
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Application pages
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── static/                # Static assets
├── requirements.txt       # Python dependencies
├── run.py                # Flask application entry
├── docker-compose.yml
└── README.md
```

---

## 📄 License

Licensed under the [MIT License](LICENSE).

---

## ❤️ Contribute

**BookOracle** is open source and contributions are welcome!

Pull requests, bug reports, and feature suggestions are appreciated.
