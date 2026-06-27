require('dotenv').config();

const mongoose = require('mongoose');
const connectToMongoDB = require('../databases/mongodbConnection');
const User = require('../models/Users');
const Room = require('../models/Rooms');
const Message = require('../models/Messages');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const args = process.argv.slice(2);

function getFlagValue(name, fallback = null) {
  const match = args.find(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (!match) {
    return fallback;
  }

  const parts = match.split('=');
  if (parts.length === 1) {
    return true;
  }

  const value = parts[1];
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== '' ? parsed : value;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function escapeSeedName(value) {
  return String(value).trim();
}

function buildSeedUsers(count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      username: `seed_user_${number}`,
      email: `seed_user_${number}@example.com`,
      password: `Password123!`,
      avatar: '',
      lastLogin: new Date(),
      settings: {
        theme: index % 2 === 0 ? 'light' : 'dark'
      }
    };
  });
}

function buildRoomName(index, ownerUsername) {
  return `Seed Room ${String(index + 1).padStart(2, '0')} - ${ownerUsername}`;
}

function pickUsersForRoom(users, roomIndex) {
  const owner = users[roomIndex % users.length];
  const members = new Set([owner._id.toString()]);

  const desiredMembers = Math.min(users.length, 3 + (roomIndex % 3));
  for (let i = 0; i < users.length && members.size < desiredMembers; i += 1) {
    const user = users[(roomIndex + i) % users.length];
    members.add(user._id.toString());
  }

  return {
    owner,
    memberIds: Array.from(members)
  };
}

async function ensureSeedUsers(count) {
  const definitions = buildSeedUsers(count);
  const users = [];

  for (const definition of definitions) {
    const existing = await User.findOne({ username: definition.username });
    if (existing) {
      users.push(existing);
      continue;
    }

    const created = await User.create(definition);
    users.push(created);
  }

  return users;
}

async function seedRooms(users, roomCount) {
  const rooms = [];

  for (let i = 0; i < roomCount; i += 1) {
    const { owner, memberIds } = pickUsersForRoom(users, i);
    const name = buildRoomName(i, owner.username);
    const existingRoom = await Room.findOne({ name, roomOwner: owner._id });

    if (existingRoom) {
      rooms.push(existingRoom);
      continue;
    }

    const room = await Room.create({
      name,
      roomOwner: owner._id,
      users: memberIds,
      banned: [],
      isPrivate: i % 2 === 1,
      pendingRequests: []
    });

    rooms.push(room);
  }

  return rooms;
}

async function seedMessagesAndNotifications(users, rooms, messageCount, seedNotifications) {
  for (let roomIndex = 0; roomIndex < rooms.length; roomIndex += 1) {
    const room = rooms[roomIndex];
    const existingMessages = await Message.countDocuments({ room: room._id });
    if (existingMessages > 0) {
      logger.info('seed/messages', `Skipping room ${room.name}; messages already exist`);
      continue;
    }

    const roomMembers = await User.find({ _id: { $in: room.users } }).select('username');
    const recipients = roomMembers.length ? roomMembers : users;

    const createdMessages = [];
    for (let messageIndex = 0; messageIndex < messageCount; messageIndex += 1) {
      const sender = recipients[(roomIndex + messageIndex) % recipients.length];
      const timestamp = new Date(Date.now() - (messageCount - messageIndex) * 60000 - roomIndex * 10000);
      const message = await Message.create({
        content: `[seed] Message ${messageIndex + 1} in ${room.name}`,
        user: sender._id,
        room: room._id,
        timestamp
      });
      createdMessages.push(message);
    }

    if (!seedNotifications) {
      continue;
    }

    const existingSeedNotifications = await Notification.countDocuments({
      roomId: room._id.toString(),
      message: { $regex: '^\\[seed\\]' }
    });

    if (existingSeedNotifications > 0) {
      logger.info('seed/notifications', `Skipping room ${room.name}; seed notifications already exist`);
      continue;
    }

    for (const message of createdMessages) {
      const senderId = message.user.toString();
      for (const recipientId of room.users) {
        if (recipientId.toString() === senderId) {
          continue;
        }

        await Notification.create({
          sender: senderId,
          recipient: recipientId,
          message: `[seed] New message in ${room.name}`,
          read: false,
          roomId: room._id.toString()
        });
      }
    }
  }
}

async function main() {
  const shouldReset = hasFlag('reset');
  const seedRoomsFlag = hasFlag('rooms') || hasFlag('messages') || hasFlag('notifications');
  const seedMessagesFlag = hasFlag('messages') || hasFlag('notifications');
  const seedNotificationsFlag = hasFlag('notifications');

  const userCount = Math.max(Number(getFlagValue('userCount', 6)) || 6, 2);
  const roomCount = Math.max(Number(getFlagValue('roomCount', 8)) || 8, 1);
  const messageCount = Math.max(Number(getFlagValue('messageCount', 12)) || 12, 1);

  await connectToMongoDB();

  if (shouldReset) {
    logger.warn('seed/reset', 'Removing rooms, messages, and notifications before seeding');
    await Promise.all([
      Message.deleteMany({}),
      Notification.deleteMany({}),
      Room.deleteMany({})
    ]);
  }

  const users = await ensureSeedUsers(userCount);

  let rooms = [];
  if (seedRoomsFlag) {
    rooms = await seedRooms(users, roomCount);
  }

  if (seedMessagesFlag) {
    if (!rooms.length) {
      rooms = await Room.find().sort({ updatedAt: -1 }).limit(roomCount);
    }

    if (!rooms.length) {
      logger.warn('seed/messages', 'No rooms available to seed messages');
    } else {
      await seedMessagesAndNotifications(users, rooms, messageCount, seedNotificationsFlag);
    }
  }

  logger.info(
    'seed/complete',
    `Seed finished. users=${users.length} rooms=${rooms.length} messages=${seedMessagesFlag ? messageCount : 0} notifications=${seedNotificationsFlag ? 'enabled' : 'disabled'}`
  );

  await mongoose.disconnect();
}

main().catch(async error => {
  logger.error('seed/main', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect failures on exit
  }
  process.exit(1);
});
