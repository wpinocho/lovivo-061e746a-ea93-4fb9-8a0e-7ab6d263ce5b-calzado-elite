import { useNewsletterLogic } from '@/adapters/NewsletterAdapter';

/**
 * FORBIDDEN HEADLESS COMPONENT - HeadlessNewsletter
 * 
 * Este componente headless expone la lógica de newsletter mediante render props.
 * Los componentes de UI pueden consumir esta lógica sin modificarla.
 */

interface HeadlessNewsletterProps {
  children: (logic: ReturnType<typeof useNewsletterLogic>) => React.ReactNode;
}

export const HeadlessNewsletter = ({ children }: HeadlessNewsletterProps) => {
  const logic = useNewsletterLogic();
  return <>{children(logic)}</>;
};
