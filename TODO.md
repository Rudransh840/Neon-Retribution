# Neo Retribution - Debugging TODO

## Issues to Fix:

### 1. Frontend - Drone.js (CRITICAL)
- [ ] Fix duplicate draw() methods - merge into one proper method
- [ ] Fix case sensitivity: rename Drone.js to drone.js (lowercase)

### 2. Frontend - index.html
- [ ] Fix script src paths to use lowercase: drone.js, difficultymanager.js

### 3. Frontend - Game.js
- [ ] Add auth-btn event listener in init() function

### 4. Backend - package.json
- [ ] Fix main field: change from "index.js" to "server.js"

### 5. Backend - Create .env file
- [ ] Create .env file with MONGO_URI and JWT_SECRET

### 6. Backend - server.js
- [ ] Add proper CORS configuration for deployment

### 7. Asset folder structure
- [ ] Create assets/sounds folder (empty placeholder for now)

## Deployment Steps:
- [ ] Test locally
- [ ] Prepare for Render/Netlify/Vercel deployment
