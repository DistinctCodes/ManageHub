'use client';

import { useState } from 'react';
import EmailResetPassword from './EmailResetPassword';
import ResendPassword from './ResendPassword';

const ResetPasswordLayout = () => {
  const [active, setActive] = useState<'email' | 'resend'>('email');

  const handleSetActive = (value: 'email' | 'resend') => {
    setActive(value);
  };

  return (
    <>
      {active === 'email' ? (
        <EmailResetPassword onTogglePage={handleSetActive} />
      ) : (
        <ResendPassword />
      )}
    </>
  );
};

export default ResetPasswordLayout;
