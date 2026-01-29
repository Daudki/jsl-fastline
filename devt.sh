# 1. Start all services
./start-dev.sh

# 2. Monitor logs
pm2 logs

# 3. Run tests
cd backend && npm test
cd frontend && npm test

# 4. Check code quality
npm run lint
