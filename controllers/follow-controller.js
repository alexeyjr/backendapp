const { prisma } = require('../prisma/prisma-client');

const FollowController = {
  followUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;
    if (followingId === userId) {
      return res.status(500).json({ error: 'Не можете подписаться на самого себя' });
    }
    try {
      const existingSubscription = await prisma.follow.findFirts({
        where: {
          AND: [
            { followerId: userId },
            { followingId }
          ]
        }
      })
      if (existingSubscription) {
        return res.status(400).json({ error: 'Подписка уже существует' });
      }
      await prisma.follows.create({
        data: {
          follower: { connect: { id: userId } },
          following: { connect: { id: followingId } },
        }
      })
      res.status(201).json({ message: 'подписка успешно создана' });
    } catch (error) {
      console.error('follow error', error)
      return res.status(500).json({ error: 'internal server error' });
    }
  },
  unfollowUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    try {
      const follows = await prisma.follows.findFirts({
        where: {
          AND: [
            { followerId: userId },
            { followingId }
          ]
        }
      })
      if (!follows) {
        return res.status(404).json({ error: 'вы не подписаны на этого пользователя' });
      }
      await prisma.follows.delete({
        where: {id: follows.id}
      })
      res.status(201).json({ message: "вы отписались" });
    } catch (error) {
      console.error('UnFollow error', error)
      return res.status(500).json({ error: 'internal server error' });
    }
  }
}

module.exports = FollowController;