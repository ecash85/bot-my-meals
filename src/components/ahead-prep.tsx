export function AheadPrepNotice({ text }: { text: string }) {
  return (
    <p
      data-slot="ahead-prep"
      className="type-body rounded-[14px] bg-secondary px-4 py-3 text-foreground"
    >
      {text}
    </p>
  );
}
