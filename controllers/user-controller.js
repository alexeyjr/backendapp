const { prisma } = require("../prisma/prisma-client");
const bcrypt = require('bcryptjs');
const Jdenticon = require('jdenticon');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken');

const UserController = {
  register: async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    try {
      const existingUser = await prisma.user.findUnique(({ where: { email } }));
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const png = Jdenticon.toPng(`${name}${Date.now()}`, 200);
      const avatarName = `${name}_${Date.now()}.png`;
      const avatarPath = path.join(__dirname, '/../uploads', avatarName);
      fs.writeFileSync(avatarPath, png);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl: `/uploads/${avatarName}`
        }
      })
      res.json(user)
    } catch (error) {
      console.error('Error in register', error)
      res.status(500).json({error: 'internal server error'})
    }

  },
  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({error: 'Неверный логин или пароль'})
      }
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        return res.status(400).json({error: 'Неверный логин или пароль'})
      }
      const token = jwt.sign(({ userId: user.id }), process.env.SECRET_KEY)
      res.json({ token });
    } catch (error) {
      console.error('Login error', error)
      res.status(500).json({ error: 'internal server error' });
    }
  },
  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          followers: true,
          following: true
        }
      });
      if (!user) {
        return res.status(404).json({ error: 'пользователь не найден' });
      }
      const isFollowing = await prisma.follows.findFirst({
        where: {
          AND: [
            { followerId: userId },
            {followingId: id}
          ]
        }
      })
      res.json({...user, isFollowing: Boolean(isFollowing)})
    } catch (error) {
      console.error('Get current error', error);
      res.status(500).json({error: 'internal server error'})
    }
  },
  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, name, dateOfBirth, bio, location } = req.body;

    let filePath;

    if (req.file && req.file.path) {
      filePath = req.file.path
    }

    if (id !== req.user.userId) {
      return res.status(403).json({error: 'нет доступа'})
    }
    try {
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {email}
        })
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ error: 'почта уже использована' });
        }
      }
      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email || undefined,
          name: name || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio || undefined,
          location: location || undefined
        }
      })
      res.json(user)
    } catch (error) {
      console.error('update user error', error);
      res.status(500).json({ error: 'internal server error' });
    }
  },
  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId
        },
        include: {
          followers: {
            include: {
              follower: true
            }
          },
          following: {
            include: {
              following: true
            }
          }
        }
      })
      if (!user) {
        return res.status(400).json({ error: 'не удалось найти пользователя' });
      }
      res.json(user)
    } catch (error) {
      console.error('get current error', error);
      res.status(500).json({ error: 'internal server error' });
    }
  },
}

module.exports = UserController;