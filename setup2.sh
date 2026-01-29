cd ~/jsl-fastline/backend

# Initialize if package.json doesn't exist
if [ ! -f package.json ]; then
  npm init -y
fi

# Install all dependencies
npm install express cors helmet compression morgan dotenv mongoose jsonwebtoken bcryptjs socket.io multer uuid redis bull
npm install -D nodemon

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/jslfastline
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=jsl-fastline-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI Services (optional for now)
OPENAI_API_KEY=your-key-here
GOOGLE_TRANSLATE_API_KEY=your-key-here

# Sync Configuration
SYNC_BATCH_SIZE=50
SYNC_RETRY_LIMIT=3

# File Storage
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
EOF
fi

# Create uploads directory
mkdir -p uploads

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test MongoDB connection
mongosh --eval "db.runCommand({ping: 1})"
# Should return: { ok: 1 }

# Test Redis connection
redis-cli ping
# Should return: PONG
