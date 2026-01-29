cd frontend

# Create MongoDB database and collections
mongosh jslfastline --eval "
db.createCollection('users');
db.createCollection('posts');
db.createCollection('groups');
db.createCollection('messages');

// Create indexes
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ localId: 1 });
db.posts.createIndex({ userId: 1, createdAt: -1 });
db.posts.createIndex({ location: '2dsphere' });
db.groups.createIndex({ location: '2dsphere' });
db.groups.createIndex({ type: 1, memberCount: -1 });

print('Database initialized successfully');
"
