export const environment = {
  production: true,
  /**
   * Public URL of the deployed Express API (server/). Required for sign-in after email verification.
   * Example: 'https://trustcom-api.onrender.com' (no trailing slash).
   * Firebase signup works without this; login and app data sync need it.
   */
  apiUrl: 'https://committee-management-1.onrender.com',
  useSupabasePasswordReset: false,
  usePhoneOtpAuth: false,
  useFirebaseEmailVerification: true,
  recaptchaSiteKey: '',
  appUrl: 'https://committee-management-ten.vercel.app',
  supabase: {
    url: 'https://lvinxglqpdrljtqwuqrm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aW54Z2xxcGRybGp0cXd1cXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDM3NDUsImV4cCI6MjA5MzgxOTc0NX0.zZ8mhsuhWbhfPEjrEz1OwkbtnlF5dWtMVGeiHXU5uJI',
  },
  firebase: {
    apiKey: 'AIzaSyD3Ua8oSzDUmDkjqVfeCoZtLSW22xI9aFU',
    authDomain: 'trustcom-7badb.firebaseapp.com',
    projectId: 'trustcom-7badb',
    appId: '1:794281052849:web:4819736d90e2016e66f090',
  },
};
