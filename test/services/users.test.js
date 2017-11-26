const { expect } = require('chai'),
  HttpStatus = require('http-status-codes');

const app = require('../../src/app');

describe('"users" service', () => {

  let api;
  before(() => api = app.get('apiClient'));

  it('registered the service', () => {
    expect( app.service('users') ).to.be.ok;
  });

  let user, 
    userToken,
    otherUser;

  // Create user
  describe('create user', () => {

    it('create user', async () => {
      const res = await api.post('/users', {
        firstName: 'User 1',  lastName: 'User 1',
        email: 'user1@mail.com', password: 'abc123'
      });

      expect(res.status).to.be.eq(HttpStatus.CREATED);
      expect(res.data).to.be.an('object').that.has.keys('id', 'firstName', 'lastName', 'email');
    });

    it('refuse creating user if email alredy exist', async () => {
      try {
        await api.post('/users', {
          firstName: '123',  lastName: '456',
          email: 'user1@mail.com', password: '789'
        });
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.BAD_REQUEST);
      }
    });

  });

  // Login user
  describe('login user', () => {

    it('login user', async () => {
      const res = await api.post('/authentication', {
        strategy: 'local',
        email: 'user1@mail.com',
        password: 'abc123'
      });

      expect(res.status).to.be.eq(HttpStatus.CREATED);

      const data = res.data;
      expect(data).to.be.an('object').that.has.keys('accessToken', 'user');
      expect(data.user).to.be.an('object').that.has.keys('id', 'firstName', 'lastName', 'email');

      // Save user and token
      user = data.user;
      userToken = data.accessToken;
    });

    it('refuse login user if email or password incorrect', async () => {
      try {
        await api.post('/authentication', {
          strategy: 'local',
          email: 'nobody@mail.com',
          password: 'no-matter'
        });
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.UNAUTHORIZED);
      }
    });
      
  });

  // Update user
  describe('update user', () => {

    before(async () => {
      // Create other user
      otherUser = (await api.post('users', {
        firstName: 'User 2', lastName: 'User 2',
        email: 'user2@mail.com', password: 'abc123'
      })).data;
    });

    it('refuse updating user if token failed', async () => {
      try {
        await api.patch(`users/${user.id}`, {});
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.UNAUTHORIZED);
      }
    });

    it('refuse updating user if not owner', async () => {
      try {
        await api.patch(`users/${otherUser.id}`, {}, {
          headers: api.tokenize(userToken)
        });
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.FORBIDDEN);
      }
    });

    it('update user', async () => {
      const res = await api.patch(`users/${user.id}`, { firstName: 'Mike' }, {
        headers: api.tokenize(userToken)
      });
      
      expect(res.status).to.be.eq(HttpStatus.OK);
      
      const data = res.data;
      expect(data).to.be.an('object').that.has.keys('id', 'firstName', 'lastName', 'email');
      expect(data.firstName).to.be.eq('Mike');
    });

  });

  // Delete user
  describe('delete user', () => {

    it('refuse deleting user if token failed', async () => {
      try {
        await api.delete(`users/${user.id}`);
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.UNAUTHORIZED);
      }
    });

    it('refuse deleting user if not owner', async () => {
      try {
        await api.delete(`users/${otherUser.id}`, {
          headers: api.tokenize(userToken)
        });
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.FORBIDDEN);
      }
    });

    it('refuse deleting user if incorrect password', async () => {
      try {
        await api.delete(`users/${user.id}?password=1111`, {
          headers: api.tokenize(userToken)
        });
      } catch (err) {
        expect(err.response.status).to.be.eq(HttpStatus.FORBIDDEN);
      }
    });

    it('delete user', async () => {
      const res = await api.delete(`users/${user.id}?password=abc123`, {
        headers: api.tokenize(userToken)
      });
      expect(res.status).to.be.eq(HttpStatus.OK);
    });

  }); 

});
