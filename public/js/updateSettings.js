/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alert';

// Data is an object contains fields need to update
export const updateUserIdentification = async data => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/updateMe',
      data
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Updated successfully!');
      window.setTimeout(() => {
        location.reload(true);
      }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const updateUserPassword = async (
  currentPass,
  newPass,
  newPassConfirm
) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/updateMyPassword',
      data: {
        currentPassword: currentPass,
        newPassword: newPass,
        newPasswordConfirm: newPassConfirm
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Password updated successfully!');
      window.setTimeout(() => {
        location.reload(true);
      }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
