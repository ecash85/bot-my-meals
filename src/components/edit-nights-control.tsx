"use client";

import { EDIT_NIGHTS_LABEL } from "@/lib/edit-nights";

export function EditNightsControl({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      type="button"
      data-slot="edit-nights"
      className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-base font-semibold text-primary"
      onClick={onEdit}
    >
      {EDIT_NIGHTS_LABEL}
    </button>
  );
}
