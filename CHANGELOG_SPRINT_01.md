# Deep Holes — Sprint 01

## Implemented

- Added the exclusive first burrow for `lanarahal`.
- Configured the owner/admin prototype wallet:
  `8radQBX8A5M2NPfQcjPDCRAPVUBzx2vhcVwQQtaPExR3`
- Added prototype administrator controls:
  - Edit/delete chat messages
  - Ban/unban users
  - Delete user data
  - Edit hole owner, name, description and depth
  - Delete holes
  - Clear chat
  - Reset demo economy
- Added a hard maximum depth of 50.
- Changed floor progression to one new floor every 5 depth levels.
- Added a personal player character when entering another player's burrow.
- Added an owner NPC on the deepest floor of every burrow.
- Added owner NPC interaction with:
  - Online/offline status
  - Burrow depth
  - Floor count
  - Picture count
  - Estimated value
  - Visits
  - Likes
  - Tips
  - Message owner
  - Like/unlike
  - Tip owner
- Added visit tracking, likes and tips.
- Expanded the leaderboard to all holes and all known players instead of the top 10 only.
- Added sparse sponsor billboard locations and utility stalls between burrows.
- Region boundaries are now exactly 2,000 world pixels apart.
- Added several selectable burrow styles for new purchases.
- The selected burrow style is visible on the world map.
- The special first burrow cannot be listed or sold in the prototype market.

## Important Prototype Limitation

The current project is still a client-side prototype. Admin privileges, ownership, balances, likes, tips, moderation and market operations are not yet cryptographically secured. They must move to authenticated backend logic and/or Solana programs before real money or production assets are used.
