#!/bin/bash
echo "Starting JSL FastLine Development Environment..."

# Start MongoDB
sudo systemctl start mongodb
echo "✓ MongoDB started"

# Start Redis
sudo systemctl start redis-server
echo "✓ Redis started"

# Start backend
cd ~/jsl-fastline/backend
npm run dev &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"

# Start frontend
cd ~/jsl-fastline/frontend
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "Applications running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  API Docs: http://localhost:5000/api-docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; echo 'Services stopped'" INT
wait
