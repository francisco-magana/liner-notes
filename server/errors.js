/** An error whose message is safe to show to the user, sent with the given HTTP status. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = message => new HttpError(400, message);
export const notFound = message => new HttpError(404, message);

/** An outside service (Spotify, an image host) failed or could not be reached. */
export const badGateway = message => new HttpError(502, message);
