declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        currency?: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

interface OpenPaystackPopupArgs {
  publicKey: string;
  email: string;
  amountNaira: number;
  reference: string;
  onSuccess: (reference: string) => void;
  onClose?: () => void;
}

/**
 * Opens Paystack's inline popup — no page redirect, no callback-URL
 * configuration to get wrong. `onSuccess` fires with the reference once the
 * popup itself reports success; the caller is still responsible for hitting
 * the backend's /verify endpoint, since that's the only server-trusted
 * confirmation (never credit a wallet or confirm a booking off the popup
 * callback alone).
 */
export function openPaystackPopup({
  publicKey,
  email,
  amountNaira,
  reference,
  onSuccess,
  onClose,
}: OpenPaystackPopupArgs) {
  if (!window.PaystackPop) {
    throw new Error("Paystack script hasn't loaded yet — check your internet connection and try again.");
  }

  const handler = window.PaystackPop.setup({
    key: publicKey,
    email,
    amount: Math.round(amountNaira * 100), // kobo
    ref: reference,
    currency: "NGN",
    callback: (response) => onSuccess(response.reference),
    onClose: () => onClose?.(),
  });

  handler.openIframe();
}
