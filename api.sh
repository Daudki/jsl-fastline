# Test health endpoint
curl http://localhost:5000/api/health
# Should return: {"status":"healthy"}

# Test auth endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "0712345678"}'
