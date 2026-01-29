# Build frontend
cd ~/jsl-fastline/frontend
npm run build

# The built files will be in dist/ directory
# You can serve them with:
npm install -g serve
serve -s dist -l 3000

# For backend production
cd ~/jsl-fastline/backend
NODE_ENV=production node src/server.js

# Or use PM2 for production
pm2 start src/server.js --name jsl-backend
pm2 start serve --name jsl-frontend -- -s ../frontend/dist -l 3000
pm2 save
pm2 startup
