# Evolvian Backend API

FastAPI backend for Evolvian authentication and user management.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `POST /api/auth/logout` - Logout (clear cookie)
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/verify` - Verify token validity

## Database

Uses SQLite database (`evolvian.db`) for local development.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- HTTPOnly cookies for session management
- 7-day token expiration
