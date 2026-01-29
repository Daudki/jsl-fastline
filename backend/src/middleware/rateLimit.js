import rateLimitLib from 'express-rate-limit'

/**
 * Create a rate limiter middleware.
 * @param {number} max - Max requests per window
 * @param {number} windowSeconds - Window in seconds
 * @returns {Function} Express middleware
 */
export function rateLimit(max, windowSeconds) {
  return rateLimitLib({
    windowMs: windowSeconds * 1000,
    max,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  })
}

