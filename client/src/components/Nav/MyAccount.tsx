import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import { cn } from '~/utils';
import TokenCreditsItem from './SettingsTabs/Balance/TokenCreditsItem';
import AddCredits from './SettingsTabs/Balance/AddCredits';

type TMyAccountProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MyAccount({ open, onOpenChange }: TMyAccountProps) {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const [showAddCredits, setShowAddCredits] = useState(false);

  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && !!startupConfig?.balance?.enabled,
  });
  
  const tokenCredits = balanceQuery.data?.tokenCredits ?? 0;

  return (
    <Transition appear show={open}>
      <Dialog as="div" className="relative z-50" onClose={onOpenChange}>
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black opacity-50 dark:opacity-80" aria-hidden="true" />
        </TransitionChild>

        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className={cn('fixed inset-0 flex w-screen items-center justify-center p-4')}>
            <DialogPanel
              className={cn(
                'w-full max-w-md overflow-hidden rounded-xl bg-background shadow-2xl backdrop-blur-2xl animate-in sm:rounded-2xl',
              )}
            >
              <DialogTitle
                className="mb-1 flex items-center justify-between p-6 pb-4 text-left border-b border-border-light dark:border-border-dark"
                as="div"
              >
                <h2 className="text-lg font-medium leading-6 text-text-primary">
                  {showAddCredits ? localize('com_nav_add_credits') : localize('com_nav_my_account')}
                </h2>
                <button
                  type="button"
                  className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-border-xheavy focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-surface-primary dark:focus:ring-offset-surface-primary"
                  onClick={() => onOpenChange(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-text-primary"
                  >
                    <line x1="18" x2="6" y1="6" y2="18"></line>
                    <line x1="6" x2="18" y1="6" y2="18"></line>
                  </svg>
                  <span className="sr-only">{localize('com_ui_close')}</span>
                </button>
              </DialogTitle>
              <div className="p-6">
                {showAddCredits ? (
                  <AddCredits onCancel={() => setShowAddCredits(false)} />
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* Balance Section */}
                    <div className="space-y-2">
                      <TokenCreditsItem tokenCredits={tokenCredits} />
                    </div>
                    
                    {/* Add Credits Section */}
                    <div className="flex justify-end">
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowAddCredits(true)}
                      >
                        {localize('com_nav_add_credits')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
