import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { callEdge } from "@/lib/edge";
import { STORE_ID } from "@/lib/config";

/**
 * FORBIDDEN ADAPTER - NewsletterAdapter
 * 
 * Este adaptador expone toda la lógica de suscripción a newsletter de forma controlada.
 * Los componentes de UI solo pueden consumir estos métodos, no modificar la lógica interna.
 * 
 * Campos disponibles:
 * - email: obligatorio
 * - firstName, lastName, phone: opcionales
 */
export const useNewsletterLogic = () => {
  const { toast } = useToast();
  
  // States
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Email validation (reutilizada de CheckoutAdapter)
  const isValidEmail = (emailValue: string) => {
    const trimmed = emailValue.trim();
    if (trimmed.length < 5) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) && trimmed.includes('.') && !trimmed.endsWith('.');
  };

  // Subscribe handler
  const handleSubscribe = async () => {
    setError("");
    
    const trimmedEmail = email.trim();
    
    // Validate email (obligatorio)
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar datos para enviar
      const newsletterData: any = {
        email: trimmedEmail,
        allow_mkt: true
      };

      // Agregar campos opcionales si están presentes
      if (firstName.trim()) {
        newsletterData.first_name = firstName.trim();
      }
      if (lastName.trim()) {
        newsletterData.last_name = lastName.trim();
      }
      if (phone.trim()) {
        newsletterData.phone = phone.trim();
      }

      // Llamar a la edge function newsletter-subscribe
      await callEdge('newsletter-subscribe', {
        store_id: STORE_ID,
        ...newsletterData
      });

      setSuccess(true);
      toast({
        title: "✅ Subscribed!",
        description: "You'll receive our promotional emails soon",
        duration: 3000,
      });

      // Auto-reset después de 3 segundos
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (err: any) {
      console.error('newsletter-subscribe error:', err);
      setError("Something went wrong. Please try again.");
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setSuccess(false);
    setError("");
  };

  return {
    // States
    email,
    firstName,
    lastName,
    phone,
    isSubmitting,
    success,
    error,
    
    // Setters
    setEmail,
    setFirstName,
    setLastName,
    setPhone,
    
    // Actions
    handleSubscribe,
    resetForm,
    
    // Utils
    isValidEmail,
  };
};
