# Deployment Guide for Railway

This application is ready to be deployed to Railway. Follow these steps:

## 1. Prerequisites
- A GitHub repository with this code.
- A Railway account connected to your GitHub.

## 2. Setting up the Project on Railway
1. Go to [Railway](https://railway.app/) and click **New Project**.
2. Select **Deploy from GitHub repo**.
3. Choose your repository.
4. Click **Deploy Now**.


## 3. Environment Variables
You MUST set the following environment variables in the Railway dashboard (**Variables** tab):

### Database (PostgreSQL)
1. Add a **PostgreSQL** service to your Railway project.
2. Railway will automatically provide a `DATABASE_URL` variable.

### Essential Variables
- `NODE_ENV`: Set to `production`.
- `STRIPE_SECRET_KEY`: Your Stripe secret key.
- `FIREBASE_SERVICE_ACCOUNT`: The JSON content of your Firebase service account key (as a single-line string).
- `ENCRYPTION_KEY`: A long, random string for data encryption.
- `JWT_SECRET`: A long, random string for token signing.
- `APP_URL`: The public URL of your Railway app (e.g., `https://your-app.up.railway.app`).

### Client-side (Vite) Variables
These must be set so Vite can bake them into the client build:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- (And other `VITE_` variables from `.env.example`)

## 4. Required Files
The following files MUST be present in your repository:
- `package.json`
- `package-lock.json`
- `server.ts`
- `firebase-applet-config.json` (This file is required by the server to identify your Firebase project).
- All source files in `src/`.

## 5. Build Configuration
Railway should automatically detect the `package.json` and use:
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

The build command will compile the React app and bundle the backend server into `dist/server.cjs`.

## 5. Troubleshooting
- If the build fails, check the logs for missing environment variables or type errors.
- Ensure `PORT` is not hardcoded in other places; our `server.ts` uses port `3000` which is standard.
