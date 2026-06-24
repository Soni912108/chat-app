function objectIdListIncludes(list, id) {
  if (!Array.isArray(list)) {
    return false;
  }

  const idString = id.toString();

  return list.some(item => {
    return objectIdEquals(item, idString);
  });
}

function objectIdEquals(value, id) {
  if (!value || !id) {
    return false;
  }

  const idString = id.toString();
  const comparableValue = value && value._id ? value._id : value;
  return comparableValue.toString() === idString;
}

function getRoomAccess(room, userId) {
  return {
    isOwner: objectIdEquals(room.roomOwner, userId),
    isMember: objectIdListIncludes(room.users, userId),
    isBanned: objectIdListIncludes(room.banned, userId),
  };
}

module.exports = { objectIdEquals, objectIdListIncludes, getRoomAccess };
