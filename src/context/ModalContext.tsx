'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal, ModalType } from '../components/common/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string | React.ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
}

interface AlertOptions {
  title?: string;
  message: string | React.ReactNode;
  type?: ModalType;
  buttonText?: string;
}

interface ModalContextType {
  showConfirm: (options: ConfirmOptions) => void;
  confirmAsync: (options: Omit<ConfirmOptions, 'onConfirm'>) => Promise<boolean>;
  showAlert: (options: AlertOptions | string) => void;
  alertAsync: (options: AlertOptions | string) => Promise<void>;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState<{
    title: string;
    message: string | React.ReactNode;
    type: ModalType;
    confirmText: string;
    cancelText: string;
    isAlertOnly: boolean;
    onConfirmAction?: () => void | Promise<void>;
  }>({
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isAlertOnly: false
  });
  const [loading, setLoading] = useState(false);

  const closeModal = useCallback(() => {
    if (!loading) {
      setIsOpen(false);
    }
  }, [loading]);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setModalProps({
      title: options.title,
      message: options.message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      isAlertOnly: false,
      onConfirmAction: options.onConfirm
    });
    setIsOpen(true);
  }, []);

  const confirmAsync = useCallback(
    (options: Omit<ConfirmOptions, 'onConfirm'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setModalProps({
          title: options.title,
          message: options.message,
          type: options.type || 'warning',
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          isAlertOnly: false,
          onConfirmAction: () => {
            resolve(true);
          }
        });
        setIsOpen(true);
      });
    },
    []
  );

  const showAlert = useCallback((options: AlertOptions | string) => {
    const opts: AlertOptions = typeof options === 'string' ? { message: options } : options;
    setModalProps({
      title: opts.title || 'Notification',
      message: opts.message,
      type: opts.type || 'info',
      confirmText: opts.buttonText || 'Got It',
      cancelText: 'Cancel',
      isAlertOnly: true,
      onConfirmAction: undefined
    });
    setIsOpen(true);
  }, []);

  const alertAsync = useCallback((options: AlertOptions | string): Promise<void> => {
    const opts: AlertOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      setModalProps({
        title: opts.title || 'Notification',
        message: opts.message,
        type: opts.type || 'info',
        confirmText: opts.buttonText || 'Got It',
        cancelText: 'Cancel',
        isAlertOnly: true,
        onConfirmAction: () => {
          resolve();
        }
      });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = async () => {
    if (modalProps.onConfirmAction) {
      setLoading(true);
      try {
        await modalProps.onConfirmAction();
      } catch (err) {
        console.error('Modal confirmation error:', err);
      } finally {
        setLoading(false);
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  return (
    <ModalContext.Provider
      value={{
        showConfirm,
        confirmAsync,
        showAlert,
        alertAsync,
        closeModal
      }}
    >
      {children}

      <ConfirmModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modalProps.title}
        message={modalProps.message}
        type={modalProps.type}
        confirmText={modalProps.confirmText}
        cancelText={modalProps.cancelText}
        isAlertOnly={modalProps.isAlertOnly}
        loading={loading}
      />
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
