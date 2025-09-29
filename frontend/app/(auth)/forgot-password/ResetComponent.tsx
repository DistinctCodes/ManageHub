interface ResetComponentProps {
  heading: string;
  subHeading: string;
  children?: React.ReactNode;
}

const ResetComponent = ({
  heading,
  subHeading,
  children,
}: ResetComponentProps) => {
  return (
    <>
      <article>
        <h1 className='text-lg md:text-2xl font-medium leading-9 text-center text-[#101828]'>
          {heading}
        </h1>
        <p className=' text-sm md:text-lg text-center text-[#787f8b'>
          {subHeading}
        </p>
      </article>

      <section className='bg-white w-full flex flex-col items-center rounded-lg border-t-[1.5px] border-b-2 border-x-2 border-[#ebecef] p-4 md:p-8'>
        {children}
      </section>
    </>
  );
};

export default ResetComponent;
