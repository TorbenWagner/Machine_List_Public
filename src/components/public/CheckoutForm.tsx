"use client";

import { useState, type FormEvent } from "react";
import { PersonPicker } from "./PersonPicker";
import type { PublicMachine, PublicPerson } from "@/lib/types";
import { uiTexts } from "@/lib/ui-texts";
import { getOrCreateDeviceId } from "@/lib/device-data/deviceId.client";

interface CheckoutFormProps {
  qrToken: string;
  people: PublicPerson[];
  onSuccess: (machine: PublicMachine) => void;
}

export function CheckoutForm({ qrToken, people, onSuccess }: CheckoutFormProps) {
  const [personId, setPersonId] = useState<string | null>(null);
  const [projectOrLocation, setProjectOrLocation] = useState("");
  const [plannedReturnDate, setPlannedReturnDate] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!personId) {
      setError(uiTexts.errors.validationFailed);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/machines/${qrToken}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          projectOrLocation: projectOrLocation || undefined,
          plannedReturnDate: plannedReturnDate || undefined,
          comment: comment || undefined,
          deviceId: getOrCreateDeviceId(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? uiTexts.common.genericError);
        return;
      }
      onSuccess(data as PublicMachine);
    } catch {
      setError(uiTexts.common.unknownError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {uiTexts.publicMachine.formPersonLabel} <span className="text-red-600">*</span>
        </label>
        <PersonPicker people={people} value={personId} onChange={setPersonId} disabled={submitting} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {uiTexts.publicMachine.formProjectOrLocationLabel}{" "}
          <span className="text-gray-400">({uiTexts.common.optional})</span>
        </label>
        <input
          type="text"
          value={projectOrLocation}
          onChange={(event) => setProjectOrLocation(event.target.value)}
          disabled={submitting}
          maxLength={300}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {uiTexts.publicMachine.formPlannedReturnLabel}{" "}
          <span className="text-gray-400">({uiTexts.common.optional})</span>
        </label>
        <input
          type="date"
          value={plannedReturnDate}
          onChange={(event) => setPlannedReturnDate(event.target.value)}
          disabled={submitting}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {uiTexts.publicMachine.formCommentLabel}{" "}
          <span className="text-gray-400">({uiTexts.common.optional})</span>
        </label>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={submitting}
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !personId}
        className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submitting ? uiTexts.publicMachine.submitting : uiTexts.publicMachine.submitCheckout}
      </button>
    </form>
  );
}
