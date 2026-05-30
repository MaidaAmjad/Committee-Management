export const environment = {
  production: false,
  /** Empty = same-origin `/api` proxied to http://localhost:3000 (see proxy.conf.json). */
  apiUrl: '',
  useSupabasePasswordReset: false,
  usePhoneOtpAuth: false,
  /** Email signup/login verification via Firebase (not Brevo). */
  useFirebaseEmailVerification: true,
  /** Google reCAPTCHA v2 site key — https://www.google.com/recaptcha/admin (or Firebase Auth settings). */
  recaptchaSiteKey: '',
  appUrl: 'http://localhost:4200',
  supabase: {
    url: 'https://lvinxglqpdrljtqwuqrm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aW54Z2xxcGRybGp0cXd1cXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDM3NDUsImV4cCI6MjA5MzgxOTc0NX0.zZ8mhsuhWbhfPEjrEz1OwkbtnlF5dWtMVGeiHXU5uJI',
  },
  /** Firebase Web config — Firebase Console → Project settings → Your apps */
  firebase: {
    apiKey: 'AIzaSyD3Ua8oSzDUmDkjqVfeCoZtLSW22xI9aFU',
    authDomain: 'trustcom-7badb.firebaseapp.com',
    projectId: 'trustcom-7badb',
    appId: '1:794281052849:web:4819736d90e2016e66f090',
  },
};
