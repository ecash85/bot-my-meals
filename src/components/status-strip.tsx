import { memberProgressInitial } from "@/lib/initials";
import {
  statusStripCopy,
  visibleProgressPeople,
  type StatusStripPerson,
  type StatusStripState,
} from "@/lib/status-strip";
import { cn } from "@/lib/utils";

export type { StatusStripPerson };

export function StatusStrip({
  state,
  waitingOn = [],
  people,
  secondary,
}: {
  state: StatusStripState;
  waitingOn?: string[];
  people: StatusStripPerson[];
  secondary?: string;
}) {
  const copy = statusStripCopy(state, waitingOn);
  const secondaryCopy = secondary ?? copy.secondary;
  const { visible, overflow } = visibleProgressPeople(people);

  return (
    <div
      data-slot="status-strip"
      data-state={state}
      className="border-b border-border/80 bg-card/90 px-5 py-3 shadow-float backdrop-blur-md data-[state=your_turn]:border-b-primary/35 data-[state=waiting_on_others]:border-b-border data-[state=ready]:border-b-approve/35 data-[state=locked]:border-b-primary/25"
    >
      <p className="type-body font-semibold text-foreground" aria-live="polite">
        {copy.title}
      </p>
      {secondaryCopy ? (
        <p className="type-meta mt-0.5 text-muted-foreground">{secondaryCopy}</p>
      ) : null}
      {people.length > 0 ? (
        <ul className="mt-3 flex items-center gap-2" aria-label="Week progress">
          {visible.map((person) => (
            <li key={person.id}>
              <span
                data-slot="status-strip-dot"
                data-done={person.done ? "true" : "false"}
                title={person.displayName}
                aria-label={
                  person.done
                    ? `${person.displayName} is set`
                    : `${person.displayName} still has an open swap or dinner request`
                }
                className={cn(
                  "type-chip inline-flex size-8 items-center justify-center rounded-full font-semibold",
                  person.done
                    ? "bg-approve text-approve-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {memberProgressInitial(person.displayName)}
              </span>
            </li>
          ))}
          {overflow > 0 ? (
            <li>
              <span
                className="type-chip inline-flex size-8 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground"
                aria-label={`${overflow} more ${overflow === 1 ? "voter" : "voters"}`}
              >
                +{overflow}
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
