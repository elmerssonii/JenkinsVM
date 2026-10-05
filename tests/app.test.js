const request = require('supertest');

jest.mock('../database',() => ({
get:jest.fn(),
all: jest.fn(),
run: jest.fn()
}));


jest.mock('bcrypt', () => ({
compareSync: jest.fn(),
hashSync: jest.fn()
}));

const db = require('../database');
const bcrypt = require('bcrypt');
const app = require('../app');

beforeEach(() => {
db.get.mockReset();
db.all.mockReset();
db.run.mockReset();

bcrypt.compareSync.mockReset();
bcrypt.hashSync.mockReset();
});

function mockLoggedInUser(user) {
db.get.mockImplementation((sql, params, callback) => {
if (sql.includes('sessionId')) {
callback(null, user);
} else {
callback(null, null);
}
});
}

test('GET /  redirects unauthenticated user to login', async () => {
const response = await request(app).get('/');

expect(response.status).toBe(302);
expect(response.headers.location).toBe('/auth/login');
});

test('GET / returns home page for authenticated user', async () => {
mockLoggedInUser({
username: 'testuser',
sessionId: 'test-session'
});

db.all.mockImplementation((sql, callback) => {
callback(null, [
{
id: 1,
title: 'Test post',
content: 'Test content'
}
]);
});

const response = await request(app)
.get('/')
.set('Cookie', ['sessionId=test-session']);

expect(response.status).toBe(200);
expect(db.all).toHaveBeenCalled();
});

test('GET /new-post redirects unauthenticated user', async () => {
const response = await request(app).get('/new-post');

expect(response.status).toBe(302);
expect(response.headers.location).toBe('/auth/login');
});

test('POST /new-post does not create post without login', async () => {
const response = await request(app)
.post('/new-post')
.type('form')
.send({
title: 'Test title',
content: 'Test content'
});

expect(response.status).toBe(302);
expect(response.headers.location).toBe('/auth/login');
expect(db.run).not.toHaveBeenCalled();
});

test('POST /new-post creates a post for authenticated user', async () => {
mockLoggedInUser({
username: 'testuser',
sessionId: 'test-session'
});

db.run.mockImplementation((sql, params, callback) => {
callback(null);
});

const response = await request(app)
.post('/new-post')
.set('Cookie', ['sessionId=test-session'])
.type('form')
.send({
title: 'New post',
content: 'Hello world'
});

expect(response.status).toBe(302);
expect(response.headers.location).toBe('/');

expect(db.run).toHaveBeenCalledWith(
'INSERT INTO posts (title, content) VALUES (?, ?)',
['New post', 'Hello world'],
expect.any(Function)
);
});

test('GET /admin returns 403 for normal user', async () => {
mockLoggedInUser({
username: 'testuser',
sessionId:'test-session'
});

const response = await request(app)
.get('/admin')
.set ('Cookie', ['sessionId=test-session']);

expect(response.status).toBe(403);
expect(response.text).toContain('Access denied');
});

test('GET /admin allows admin user', async () => {
mockLoggedInUser({
username: 'admin',
sessionId: 'admin-session'
});

const response = await request(app)
.get('/admin')
.set('Cookie', ['sessionId=admin-session']);

expect(response.status).toBe(200);
});

test('POST /auth/login logs user in with correct password', async () => {
db.get.mockImplementation((sql, params, callback) => {
callback(null, {
username: 'testuser',
password: 'hashed-password'
});
});

bcrypt.compareSync.mockReturnValue(true);

db.run.mockImplementation((sql, params, callback) => {
callback(null);
});

const response = await request(app)
.post('/auth/login')
.type('form')
.send({
username: 'testuser',
password: 'password123'
});

expect(response.status).toBe(302);
expect(response.headers.location).toBe('/');


expect(bcrypt.compareSync)
.toHaveBeenCalledWith(
'password123',
'hashed-password'
);


expect(response.headers['set-cookie'][0])
.toContain('sessionId=');
});

test('POST /auth/login rejects invalid login', async () => {
db.get.mockImplementation((sql, params, callback) => {
callback(null, null);
});

const response = await request(app)
.post('/auth/login')
.type('form')
.send({
username: 'wrong',
password: 'wrong'
});


expect(response.status).toBe(200);
expect(db.run).not.toHaveBeenCalled();
});

test('POST /auth/register creates a new user', async () => {
bcrypt.hashSync.mockReturnValue('hashed-password');

db.get.mockImplementation((sql, params, callback) => {
callback(null, null);
});

db.run.mockImplementation((sql, params, callback) => {
callback(null);
});

const response = await request(app)
.post('/auth/register')
.type('form')
.send({
username: 'newuser',
password: 'password123'
});

expect(response.status).toBe(302);
expect(response.headers.location).toBe('/auth/login');

expect(bcrypt.hashSync)
.toHaveBeenCalledWith('password123', 10);


expect(db.run).toHaveBeenCalledWith(
'INSERT INTO users (username, password, sessionId) VALUES (?, ?, ?)',
['newuser', 'hashed-password', 0],
expect.any(Function)
);
});
