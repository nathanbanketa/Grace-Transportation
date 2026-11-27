export class BodyTooLarge extends Error {}

export async function readBody(request: Request, limit: number) {
  const stream = request.body?.getReader();
  if (!stream) return "";
  const decoder = new TextDecoder();
  let length = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await stream.read();
      if (done) return body + decoder.decode();
      length += value.length;
      if (length > limit) {
        await stream.cancel();
        throw new BodyTooLarge();
      }
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    stream.releaseLock();
  }
}
