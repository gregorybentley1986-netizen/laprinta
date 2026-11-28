// Build-time only: Next 15 fetches Google Fonts CSS from fonts.googleapis.com,
// which Node cannot reach from this network. Rewrite to a reachable mirror.
const MIRROR = "https://fonts.font.im";
const ORIGIN = "https://fonts.googleapis.com";
const orig = globalThis.fetch;
if (orig) {
  globalThis.fetch = function (input, init) {
    try {
      if (typeof input === "string" && input.startsWith(ORIGIN)) {
        input = MIRROR + input.slice(ORIGIN.length);
      } else if (input instanceof URL && input.href.startsWith(ORIGIN)) {
        input = new URL(MIRROR + input.href.slice(ORIGIN.length));
      } else if (input && typeof input === "object" && typeof input.url === "string" && input.url.startsWith(ORIGIN)) {
        return orig(new Request(MIRROR + input.url.slice(ORIGIN.length), input), init);
      }
    } catch (e) {}
    return orig(input, init);
  };
}
