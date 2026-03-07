'use client';

import { Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { useEffect, useState } from 'react';

const ResendButton = () => {
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let countDown: NodeJS.Timeout;
    if (timer > 0) {
      countDown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(countDown);
  }, [timer]);

  return (
    <Button icon={<Clock />} disabled={timer > 0} className='w-full mt-5'>
      {timer === 0 ? 'Resend Email' : `Resend Email in ${timer}s`}
    </Button>
  );
};

export default ResendButton;
