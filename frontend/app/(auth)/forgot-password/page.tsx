import Link from 'next/link';
import Email from './email';

export const metadata = {
  title: 'Forgot Password',
  description: 'Reset your password by entering your email address.',
};

const page = () => {
  return (
    <main className='min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center gap-10 p-4'>
      <section className='w-full md:w-8/12 lg:w-1/3 space-y-10 mx-auto flex flex-col items-center'>
        <Email />

        <footer className='space-y-3 text-center text-[#a2a9b6] text-sm '>
          <p className='md:text-xl text-[#787f8b] font-medium pb-3'>
            Don&apos;t have an account?{' '}
            <Link href='' className='text-primary'>
              Sign up here
            </Link>
          </p>

          <p>
            &copy; {new Date().getFullYear()} ManageHub, All rights reserved.
          </p>

          <ul className='flex items-center justify-center gap-3 *:hover:text-primary *:transition-colors *:duration-300'>
            <li>
              <Link href=''>Privacy policy</Link>
            </li>
            <li>
              <Link href=''>Terms of service</Link>
            </li>
            <li>
              <Link href=''>Support</Link>
            </li>
          </ul>
        </footer>
      </section>
    </main>
  );
};

export default page;
