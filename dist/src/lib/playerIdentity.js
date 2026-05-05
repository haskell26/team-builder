export function normalizePlayerId(name) {
  return name.trim().toLowerCase();
}

export function getPlayerId(player) {
  return player.id ?? normalizePlayerId(player.name);
}
