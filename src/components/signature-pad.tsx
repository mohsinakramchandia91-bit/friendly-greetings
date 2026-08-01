import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

export default function SignaturePad({
  disabled,
  onSign,
}: {
  disabled?: boolean;
  onSign: (dataUrl: string) => Promise<void> | void;
}) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const [empty, setEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function accept() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    setSubmitting(true);
    try {
      await onSign(pad.getCanvas().toDataURL("image/png"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="signature-pad overflow-hidden rounded-xl border border-border bg-card">
        <SignatureCanvas
          ref={padRef}
          penColor="black"
          onEnd={() => setEmpty(false)}
          canvasProps={{
            className: "h-44 w-full touch-none",
            "aria-label": "Signature canvas",
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            padRef.current?.clear();
            setEmpty(true);
          }}
          disabled={disabled || submitting}
        >
          Clear signature
        </Button>
        <Button
          size="xl"
          variant="success"
          onClick={accept}
          disabled={disabled || empty || submitting}
        >
          {submitting ? "Signing…" : "Sign & accept"}
        </Button>
      </div>
    </div>
  );
}