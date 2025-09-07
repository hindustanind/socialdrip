
import React from 'react';

interface SpinnerProps {
  text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-t-transparent border-[#00f2ff] rounded-full animate-spin"></div>
      {text && <p className="text-lg text-[#00f2ff] font-semibold tracking-wider">{text}</p>}
    </div>
  );
};

export default Spinner;