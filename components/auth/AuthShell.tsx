import React from 'react';

interface AuthShellProps {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBackHome?: boolean;
}

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const AuthShell: React.FC<AuthShellProps> = ({
  title,
  subtitle,
  children,
  footer,
  showBackHome = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-8">
        <div className="text-center space-y-4">
          {showBackHome ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex flex-col items-center gap-2 hover:opacity-90 cursor-pointer transition-opacity"
              aria-label="Về trang chủ"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <img src="/NAI.png" alt="NAI" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-[2rem] leading-none font-semibold text-[#1E3A8A]">{title}</h1>
            </button>
          ) : (
            <div className="inline-flex flex-col items-center gap-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <img src="/NAI.png" alt="NAI" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-[2rem] leading-none font-semibold text-[#1E3A8A]">{title}</h1>
            </div>
          )}
          <p className="text-sm font-medium text-slate-600 border-b border-slate-200 pb-4">{subtitle}</p>
        </div>

        {children}

        {footer ? <div className="pt-4 border-t border-slate-200">{footer}</div> : null}
      </div>
    </div>
  );
};
