// Imported by llmsTxt.js and server/chatSettings.js, so only relative imports work here.
export const siteNotice = {
  tag: "Thanksgiving",
  emoji: "🦃",
  lead: "Happy Thanksgiving!",
  parts: [
    { text: "We're closed " },
    { text: "Thursday to Saturday, November 26–28", key: true },
    { text: ". We reopen Monday, November 30 at 8 AM." },
  ],
  // Midnight after Saturday, Baytown time; the banner, chat and llms.txt lines stop showing from then.
  showUntil: "2026-11-29T00:00:00-06:00",
};

export const isNoticeActive = (now = Date.now()) => now < Date.parse(siteNotice.showUntil);

export const noticeLine = "Thanksgiving: closed Thursday to Saturday, November 26 to 28, 2026. Reopens Monday, November 30 at 8 AM.";
