import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseClasses = 'px-6 py-2 rounded-md font-bold text-white transition-all duration-500 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a0a37] active:scale-95';
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#f400f4] to-[#00f2ff] hover:scale-105 hover:shadow-[0_0_15px_#f400f4,0_0_15px_#00f2ff] hover:brightness-110',
    secondary: 'bg-white/10 border border-[#00f2ff] backdrop-blur-sm hover:scale-105 hover:shadow-[0_0_15px_#00f2ff] hover:bg-white/20',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;