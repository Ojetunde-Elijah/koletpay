Render deployment steps for the backend

1) Connect your repo to Render
   - Sign in to https://render.com and create a new Web Service.
   - Select GitHub/GitLab and pick this repository and the `backend/` directory (or root if monorepo).

2) Build & Start settings
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Docker` if you prefer to use the provided `Dockerfile`, otherwise use `Node` with the above commands.

3) Port
   - Render will provide a `PORT` env var. The app listens on `process.env.PORT` or falls back to `5000` per `.env.example`.

4) Environment variables
   - Copy keys from `.env.example` and add them in the Render dashboard under Environment > Environment Variables.
   - Required keys to set (as examples): `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`, `PAYMENTS_MODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `password`
   - Use secure random values for secrets (e.g. `JWT_SECRET`). Do NOT commit real secrets to source control.

5) MongoDB
   - The project expects a MongoDB connection string in `MONGO_URI` (Atlas recommended). Ensure network access and credentials are correct.

6) CORS / Client URLs
   - Ensure `CLIENT_ORIGINS` includes the deployed frontend URL (e.g., `https://your-frontend.onrender.com`).

7) Automatic deploys
   - Enable auto-deploys from the branch you prefer (e.g., `main` or `master`).

8) (Optional) Use Render's `render.yaml`
   - If you want infrastructure as code, create a `render.yaml` in repo root describing the service and add env var keys there. Alternatively configure via dashboard.

9) After deploy
   - Check service logs on Render for startup errors.
   - Verify `/health` or the main endpoints work and CORS is configured properly.
