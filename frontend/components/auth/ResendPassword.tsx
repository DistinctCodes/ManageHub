import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import Alert from '../ui/Alert';
import ResendButton from './ResendButton';
import ResetPasswordCard from './ResetPasswordCard';

const ResendPassword = () => {
  return (
    <ResetPasswordCard
      heading='Check Your Email'
      subHeading="we've sent password reset instructions to your email"
    >
      <article className='flex flex-col font-medium mb-8 items-center gap-2'>
        <div className='h-20 w-20 mb-3  rounded-full grid place-items-center bg-green-100'>
          <CheckCircle className='text-green-500 w-10 h-10' />
        </div>

        <p className='text-[#787f8b]'>
          We&apos;ve sent a password reset link to
        </p>
        <p className='text-[#101828]'>testuser@gmail.com</p>
      </article>

      <Alert icon={<Mail />} title='Didn’t receive the email?'>
        Check your spam folder or click the resend button below
      </Alert>

      <ResendButton />

      {/* Back to sign in */}
      <div className='flex items-center mt-6 gap-2 font-medium text-primary text-sm'>
        <ArrowLeft size={20} />
        <Link href='sign-in'>Back to Sign in</Link>
      </div>
    </ResetPasswordCard>
  );
};

export default ResendPassword;
