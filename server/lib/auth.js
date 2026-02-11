import jwt from 'jsonwebtoken';

export function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');

  return jwt.sign(
    { sub: String(user._id), role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'unauthorized' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_SECRET');
    const decoded = jwt.verify(token, secret);
    req.auth = { userId: decoded.sub, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') return res.status(403).json({ ok: false, error: 'forbidden' });
  return next();
}
