import React from 'react';

interface AlertProps {
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
}

const Alert = ({ icon, title, children }: AlertProps) => {
  return (
    <div className='bg-[#eff6ff] text-primary text-start border-1 font-medium border-[#cee3fe] border-sm p-2 md:p-4 rounded-lg flex gap-3'>
      {icon}

      <article className='space-y-1 text-xs md:text-sm'>
        <h3>{title}</h3>
        <p className='leading-4 md:leading-5'>{children}</p>
      </article>
    </div>
  );
};

export default Alert;
