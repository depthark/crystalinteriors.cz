/**
 * Guard for every /api/* function.
 *
 * The service worker enables navigation preload, so for each navigation the
 * browser sends an extra request (header `Service-Worker-Navigation-Preload`)
 * in parallel – even for paths the worker then leaves to the network. For
 * /api/callback that meant GitHub's one-time OAuth code was exchanged twice:
 * the second exchange failed with "The code passed is incorrect or expired"
 * and the CMS login broke for everyone who had visited the site before.
 * /api/auth could also race on its state cookie.
 *
 * Preload requests are answered with an empty 204 and never reach a
 * function; the real navigation request does the work. Works with any
 * service worker version already installed in visitors' browsers.
 */
interface Context {
  request: Request;
  next: () => Promise<Response>;
}

export const onRequest = ({ request, next }: Context): Promise<Response> | Response =>
  request.headers.has("Service-Worker-Navigation-Preload")
    ? new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
    : next();
