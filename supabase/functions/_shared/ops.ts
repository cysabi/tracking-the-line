const OPS = new Set(["610139623196459019"]);

export function isOp(discordId: string) {
  return OPS.has(discordId);
}
