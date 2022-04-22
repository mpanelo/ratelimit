import express, { NextFunction, Request, Response } from 'express';
import { InMemoryCache, TokenBucket } from './TokenBucket';

const app = express();
const port = 3000;

function rateLimit(rate: number, capacity: number) {
  const bucket = new TokenBucket({ rate, capacity, cache: new InMemoryCache() });

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    if (bucket.take(req.ip)) {
      next();
    } else {
      res.status(429).send('Rate limit exceeded');
    }
  };
}

app.get('/', rateLimit(2, 4), async (req, res) => {
  await sleep(2000);
  res.status(200).send('Hello World!');
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
