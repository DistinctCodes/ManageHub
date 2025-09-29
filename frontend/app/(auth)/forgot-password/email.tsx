'use client';

import { Button } from '@/components/ui/Button';
import { forgotPasswordSchema } from '@/lib/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Info, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import z from 'zod';
import ResetComponent from './ResetComponent';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const Email = () => {
  const [dummyLoadingState, setDummyLoadingState] = useState(false);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setDummyLoadingState(true);

    new Promise((resolve) => setTimeout(resolve, 3000)).then(() => {
      setDummyLoadingState(false);
      form.reset();
      console.log(values);
    });
  }
  return (
    <>
      <ResetComponent
        heading='Forgot Password'
        subHeading="No worries, we'll send you reset instructions"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='w-full'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      icon={<Mail className='h-4 w-4 ' />}
                      placeholder='Enter your email address'
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              loading={dummyLoadingState}
              icon={<Send />}
              type='submit'
              className='w-full mt-4'
            >
              Send Reset Link
            </Button>
          </form>
        </Form>

        {/* Separator */}
        <div className='flex items-center self-start gap-3 w-full text-xs md:text-sm text-[#101828] mt-6'>
          <Separator className='flex-1' />
          <p>OR</p>
          <Separator className='flex-1' />
        </div>

        {/* Back to sign in */}
        <div className='flex items-center mt-6 gap-2 font-medium text-primary text-sm'>
          <ArrowLeft size={20} />
          <Link href='sign-in'>Back to Sign in</Link>
        </div>
      </ResetComponent>

      {/* alert */}
      <div className='bg-[#eff6ff] text-primary text-start border-1 font-medium border-[#cee3fe] border-sm p-2 md:p-4 rounded-lg flex gap-3'>
        <Info />

        <article className='space-y-1 text-xs md:text-sm'>
          <h3>Need help?</h3>
          <p className='leading-4 md:leading-5'>
            If you are having trouble accessing your account, comtact our
            support team at{' '}
            <Link href='mailto:support@managehub.com' className='underline'>
              support@managehub.com
            </Link>
          </p>
        </article>
      </div>
    </>
  );
};

export default Email;
