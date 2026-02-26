// Razorpay Configuration
// Replace with your actual Live/Test keys from the Razorpay Dashboard

export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim();
export const RAZORPAY_MERCHANT_NAME = 'EventSphere';
export const RAZORPAY_THEME_COLOR = '#135bec';

// Base conversion factor (Razorpay expects amount in paisa)
export const CURRENCY_MULTIPLIER = 100; 
