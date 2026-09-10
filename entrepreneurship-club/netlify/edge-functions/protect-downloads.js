// Protects everything under /downloads/ (currently the Genesis Academy
// Study Vault book PDF). The client-side gate in main.js only hides the
// *link* to these files -- the files themselves sit at real, guessable
// URLs that Netlify would otherwise serve to anyone, gate or no gate.
//
// This checks for the "academy_unlocked" cookie, set by main.js's
// unlockAcademy() the moment a visitor's PIN or active subscription is
// confirmed. No cookie -> no file; instead they're sent back to the
// Academy gate. This matches the trust level already accepted for the
// PIN-unlock path (a client-settable flag, not a signed token) -- it
// closes the "just fetch the URL directly" gap without pretending to be
// stronger security than the rest of the gate actually is.
export default async (request, context) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const unlocked = cookieHeader
    .split(';')
    .some((pair) => pair.trim() === 'academy_unlocked=1');

  if (unlocked) {
    return context.next();
  }

  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/#academy`, 302);
};

export const config = {
  path: '/downloads/*',
};
