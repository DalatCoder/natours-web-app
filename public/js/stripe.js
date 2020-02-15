/* eslint-disable */

const stripe = Stripe('pk_test_cg8BNalmrvc0LZxFzvdRtviK00dSWpowLx');
const axios = require('axios');
import { showAlert } from './alert';

export const bookTour = async tourId => {
  try {
    // 1) Get the session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
