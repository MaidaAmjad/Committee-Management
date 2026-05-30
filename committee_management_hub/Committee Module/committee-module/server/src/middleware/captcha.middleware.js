import { verifyRecaptchaToken, isCaptchaRequired } from '../services/recaptcha.service.js';
import { AppError } from '../utils/AppError.js';

/** Require valid reCAPTCHA token in request body (`captchaToken`). */
export async function requireCaptcha(req, _res, next) {
  try {
    if (!isCaptchaRequired()) {
      return next();
    }
    const token = req.body?.captchaToken;
    if (!token) {
      return next(new AppError('Complete the security check (CAPTCHA) before continuing.', 400));
    }
    await verifyRecaptchaToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
}
