/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#004ac6',
        'primary-fixed': '#dbe1ff',
        'primary-fixed-dim': '#b4c5ff',
        'primary-container': '#2563eb',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#00174b',
        'on-primary-fixed-variant': '#003ea8',
        'on-primary-container': '#eeefff',
        'inverse-primary': '#b4c5ff',

        'secondary': '#505f76',
        'secondary-fixed': '#d3e4fe',
        'secondary-fixed-dim': '#b7c8e1',
        'secondary-container': '#d0e1fb',
        'on-secondary': '#ffffff',
        'on-secondary-fixed': '#0b1c30',
        'on-secondary-fixed-variant': '#38485d',
        'on-secondary-container': '#54647a',

        'tertiary': '#943700',
        'tertiary-fixed': '#ffdbcd',
        'tertiary-fixed-dim': '#ffb596',
        'tertiary-container': '#bc4800',
        'on-tertiary': '#ffffff',
        'on-tertiary-fixed': '#360f00',
        'on-tertiary-fixed-variant': '#7d2d00',
        'on-tertiary-container': '#ffede6',

        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        'surface': '#f7f9fb',
        'surface-dim': '#d8dadc',
        'surface-bright': '#f7f9fb',
        'surface-variant': '#e0e3e5',
        'surface-tint': '#0053db',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'on-surface': '#191c1e',
        'on-surface-variant': '#434655',
        'inverse-surface': '#2d3133',
        'inverse-on-surface': '#eff1f3',

        'background': '#f7f9fb',
        'on-background': '#191c1e',

        'outline': '#737686',
        'outline-variant': '#c3c6d7',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        'gutter': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
