import { format } from "date-fns";
import { X, Phone, User, Clock, Calendar, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { StatusBadge } from "./CallsTable";
import type { Call } from "@/types/calls";
import { updateCallNotes } from "@/services/api";
import { Button } from "@/components/ui/button";

interface CallDetailDrawerProps {
  call: Call | null;
  onClose: () => void;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Not available";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

export function CallDetailDrawer({ call, onClose }: CallDetailDrawerProps) {
  const queryClient = useQueryClient();

  //check if the notes field is editable
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  //save the textarea value while notes are being edited
  const [notesValue, setNotesValue] = useState("");

  //save the updated notes to the backend
  const updateNotes = useMutation({
    mutationFn: (notes: string | null) => {
      if (!call) {
        throw new Error("No call selected");
      }

      return updateCallNotes(call.id, notes);
    },

    onSuccess: () => {
      // refresh all calls queries so the saved notes are synced
      queryClient.invalidateQueries({ queryKey: ["calls"] });

      // close the textarea after save
      setIsEditingNotes(false);
    },
  });

  if (!call) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Call Details</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">#{call.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status banner */}
        <div className="px-6 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
          <StatusBadge status={call.status} />
          {call.label && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-border bg-white text-foreground">
              {call.label}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone Number"
            value={<span className="font-mono">{call.phone_number}</span>}
          />
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Caller Name"
            value={call.caller_name ?? "Unknown"}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="Duration"
            value={formatDuration(call.duration_seconds)}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Started At"
            value={format(new Date(call.started_at), "PPpp")}
          />
          {call.ended_at && (
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Ended At"
              value={format(new Date(call.ended_at), "PPpp")}
            />
          )}

          <DetailRow
            icon={<FileText className="h-4 w-4" />}
            label="Notes"
            value={
              isEditingNotes ? (
                <div className="space-y-2">
                  {/* Textarea shown while editing notes */}
                  <textarea
                    value={notesValue}
                    onChange={(event) => setNotesValue(event.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border p-2 text-sm"
                  />

                  <div className="flex gap-2">
                    {/* Save notes to backend */}
                    <Button
                      size="sm"
                      onClick={() => updateNotes.mutate(notesValue)}
                      disabled={updateNotes.isPending}
                    >
                      Save
                    </Button>

                    {/* Cancel editing and restore the original notes */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotesValue(call.notes ?? "");
                        setIsEditingNotes(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer rounded-md border border-border p-2 hover:bg-muted"
                  onClick={() => {
                    // Load the current notes into the textarea before editing
                    setNotesValue(call.notes ?? "");
                    setIsEditingNotes(true);
                  }}
                >
                  {call.notes || "Click to add notes"}
                </div>
              )
            }
          />
        </div>

        {/* AI Summary */}
        {call.summary && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" style={{ color: "#FDDF5C" }} />
              <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{call.summary}</p>
          </div>
        )}

        {/* Transcript */}
        {call.raw_transcript && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Transcript</h3>
            </div>
            <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {call.raw_transcript}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(call.created_at), "PPpp")}
          </p>
        </div>
      </aside>
    </>
  );
}