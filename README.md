# LAUTECH Agric Class 29 Voting System

A full-stack anonymous voting web app built with Vite + React + Tailwind CSS and Firebase Firestore + Storage.

## Voting System

- **Award Night Bulk Voting**: Perfect for events with multiple positions (Best Actor, Best Actress, etc.)
- **One Vote Per Position**: Students select one candidate for each position
- **Bulk Submission**: All votes saved together with a single "Confirm All Votes" button
- **24-Hour Cooldown**: After voting for all positions, students must wait 24 hours to vote again
- **Cumulative Voting**: Each voting session adds to the total vote counts
- **Anonymous Voting**: Uses device fingerprinting for voter identification
- **Real-time Updates**: Vote counts update immediately across all devices

## Bot Detection System

The system includes intelligent bot detection designed for student voting scenarios:

### Detection Thresholds
- **Per Voter (15 minutes)**: 12 votes maximum (allows bulk voting)
- **Per Voter (1 hour)**: 30 votes maximum (allows bulk voting)
- **System-wide (24 hours)**: 1000 total votes maximum
- **Rapid Voting**: 3+ votes within 0.5 seconds triggers detection
- **Extreme Speed**: Votes faster than 0.2 seconds apart

### Design Philosophy
- **Student-Friendly**: Allows reasonable voting frequency for students changing their minds
- **Fail-Safe**: Errors on suspicious activity but doesn't block legitimate users
- **Transparent**: Clear logging and email alerts for detected suspicious activity
- **Adaptive**: Thresholds can be adjusted based on voting patterns

### What Triggers Detection
- Automated scripts voting extremely rapidly
- Bots attempting to manipulate results
- Coordinated voting attacks
- Suspicious timing patterns

### What Doesn't Trigger Detection
- Students voting multiple times as they decide
- Group voting during peak hours
- Legitimate high participation periods
- Normal user behavior patterns

## Features

- ✅ Anonymous user identification with device fingerprinting
- ✅ Award night bulk voting (vote for multiple positions at once)
- ✅ 24-hour cooldown after bulk voting sessions
- ✅ Candidate management with image upload to Firebase Storage
- ✅ Real-time vote count updates
- ✅ Admin dashboard for settings and candidate control
- ✅ Advanced analytics and charts
- ✅ Activity feed and audit logs
- ✅ Bulk candidate import (CSV)
- ✅ Smart bot detection (30 votes/hour, 12 votes/15min, 1000 total/day)
- ✅ Email notifications for bulk votes and admin actions
- ✅ Search and filter candidates
- ✅ Favorites system
- ✅ Dark mode support
- ✅ QR code sharing
- ✅ Export audit logs to CSV

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

## Deployment to Firebase Hosting

1. Install Firebase CLI (if not already installed):

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase in your project (select Hosting when prompted):

```bash
firebase init
```

4. Build the project for production:

```bash
npm run build
```

5. Deploy to Firebase Hosting:

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.web.app`

## Alternative Deployment Options

### Vercel (Recommended for React apps)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Netlify

1. Build the project:
```bash
npm run build
```

2. Drag and drop the `dist` folder to [Netlify](https://netlify.com)

### Manual Deployment

You can also deploy the `dist` folder to any static hosting service like:
- GitHub Pages
- Surge
- Render
- Railway

## Environment Variables

Make sure to set these environment variables in your hosting platform:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=messaging_sender_id
VITE_FIREBASE_APP_ID=app_id
```
