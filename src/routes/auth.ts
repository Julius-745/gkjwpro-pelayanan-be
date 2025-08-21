import { Hono } from 'hono';
import { AuthService } from '../services/authService';
import { authenticateToken } from '../middleware/authMiddleware';

const auth = new Hono();

auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const result = await AuthService.register(body);
    
    return c.json(result, result.success ? 201 : 400);
  } catch (error) {
    console.error('Registration route error:', error);
    return c.json({
      success: false,
      message: 'Invalid request body'
    }, 400);
  }
});

auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = await AuthService.login(body);
    
    return c.json(result, result.success ? 200 : 401);
  } catch (error) {
    console.error('Login route error:', error);
    return c.json({
      success: false,
      message: 'Invalid request body'
    }, 400);
  }
});

auth.get('/profile', authenticateToken, async (c) => {
  const user = c.get('user');
  return c.json({
    success: true,
    user
  });
});

auth.post('/logout', authenticateToken, async (c) => {
  return c.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default auth;