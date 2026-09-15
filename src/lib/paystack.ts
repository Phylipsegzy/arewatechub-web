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
 * Loads Paystack's inline.js on demand — NOT globally in the root layout.
 * That script fatally throws ("Please put your Paystack Inline javascript
 * file inside of a form element") when it can't find a parent <form> on
 * the page, which crashed pages with no payment form at all (like the
 * admin panel) when it was loaded unconditionally on every route. Loading
 * it right before it's actually used, only on pages that call this, avoids
 * that entirely.
 */
function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const existing = document.getElementById("paystack-inline-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Paystack")));
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Paystack"));
    document.body.appendChild(script);
  });
}

/**
 * Opens Paystack's inline popup — no page redirect, no callback-URL
 * configuration to get wrong. `onSuccess` fires with the reference once the
 * popup itself reports success; the caller is still responsible for hitting
 * the backend's /verify endpoint, since that's the only server-trusted
 * confirmation (never credit a wallet or confirm a booking off the popup
 * callback alone).
 */
export async function openPaystackPopup({
  publicKey,
  email,
  amountNaira,
  reference,
  onSuccess,
  onClose,
}: OpenPaystackPopupArgs) {
  await loadPaystackScript();

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
