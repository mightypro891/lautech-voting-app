# LAUTECH Agric Class 29 Voting System

A full-stack anonymous voting web app built with Vite + React + Tailwind CSS and Firebase Firestore + Storage.

## Features

- Anonymous user identification with `localStorage.voterId`
- Daily voting cooldown controlled by Firebase settings
- Candidate management with image upload to Firebase Storage
- Real-time vote count updates
- Admin dashboard for settings and candidate control

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add Firebase environment variables in a `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=messaging_sender_id
VITE_FIREBASE_APP_ID=app_id
```

3. Run locally:

```bash
npm run dev
```

## Firebase Rules

This project includes starter Firestore and Storage rules in `firestore.rules` and `storage.rules`.

> Note: Without Firebase Authentication, secure admin-only access is not fully enforceable from the client side. Use a private admin route and set stricter rules once authentication is added.
