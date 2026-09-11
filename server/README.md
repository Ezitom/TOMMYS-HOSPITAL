# TOMMY'S HOSPITAL - Backend & Dashboard System Setup

This directory contains the backend server, API routes, and database configuration for the TOMMY'S HOSPITAL dashboards.

## Installation and Configuration

Follow these steps to set up and run the application locally:

### 1. Install Dependencies
Navigate to the `server/` directory and install the required NPM packages:
```bash
npm install
```

### 2. Configure Database
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the contents of the `server/supabase-schema.sql` file, paste it into the editor, and run the query. This creates the required tables, triggers, and foreign keys.

### 3. Setup Environment Variables
1. Copy the `.env.example` file to a new file named `.env` in this directory.
2. Retrieve your Supabase API details from project settings (Project Settings -> API).
3. Fill in the values for the variables:
   - `SUPABASE_URL`: Your Supabase project URL (e.g. `https://your-project-id.supabase.co`)
   - `SUPABASE_ANON_KEY`: Your project's anonymous public key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (required for administrative tasks like admin creating doctor accounts).
   - `JWT_SECRET`: A secure random string for JWT verification checks.
   - `PORT`: Set to `3000` or your desired port.

### 4. Run the Server
Start the Express server:
```bash
npm start
```
The server will start running at `http://localhost:3000`.

### 5. Access the Dashboards
1. Open your browser and navigate to the patient registration page:
   `http://localhost:3000/dashboards/auth/register.html`
2. Fill out the fields to register a patient account.
3. To configure the first admin user:
   - Go to your Supabase project dashboard.
   - Access the `profiles` database table in the Table Editor.
   - Locate the row for your registered user and change the `role` field value from `patient` to `admin`.
   - Update changes. Now you can log in as an administrator.
