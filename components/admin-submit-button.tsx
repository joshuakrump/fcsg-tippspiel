"use client";

import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = {
  idleText: string;
  pendingText: string;
  className: string;
};

export function AdminSubmitButton({
  idleText,
  pendingText,
  className,
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}
