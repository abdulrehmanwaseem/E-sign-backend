# Simple OAuth Setup Guide

## Backend Setup

### 1. Install Dependencies

```bash
cd server
npm install passport passport-google-oauth20 passport-apple
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://e-sign-backend.onrender.com/api/v1/oauth/google/callback

# Apple OAuth (optional)
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=path/to/your/apple/private/key.p8
APPLE_CALLBACK_URL=https://e-sign-backend.onrender.com/api/v1/oauth/apple/callback

# Client URL
CLIENT_URL=https://your-frontend-domain.com
```

### 3. Update Database

```bash
npx prisma generate
npx prisma db push
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URIs to: `https://e-sign-backend.onrender.com/api/v1/oauth/google/callback`

## API Endpoints

### OAuth Routes

- `GET /api/v1/oauth/google` - Start Google OAuth
- `GET /api/v1/oauth/apple` - Start Apple OAuth
- `GET /api/v1/oauth/status` - Check OAuth status

### Auth Routes

- `POST /api/v1/auth/signup` - Register with email/password
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/auth/me` - Get user profile
- `GET /api/v1/auth/logout` - Logout

## How It Works

1. **User clicks OAuth button** → Redirects to Google/Apple
2. **User logs in** → Google/Apple redirects back to your server
3. **Server creates/updates user** → Sets JWT cookie
4. **User is redirected** → To your dashboard

## Testing

```bash
# Check OAuth status
curl https://e-sign-backend.onrender.com/api/v1/oauth/status

# Test Google OAuth (opens Google login)
curl https://e-sign-backend.onrender.com/api/v1/oauth/google
```

## Frontend Integration

Simple buttons that redirect to OAuth URLs:

```jsx
// Google OAuth button
<a href="https://e-sign-backend.onrender.com/api/v1/oauth/google">
  Login with Google
</a>

// Apple OAuth button
<a href="https://e-sign-backend.onrender.com/api/v1/oauth/apple">
  Login with Apple
</a>
```

That's it! Much simpler than the complex version.
