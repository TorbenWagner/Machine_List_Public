"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { CheckoutForm } from "./CheckoutForm";
import { CheckinForm } from "./CheckinForm";
import type { PublicMachine, PublicPerson } from "@/lib/types";
import { uiTexts } from "@/lib/ui-texts";
import { formatDateTimeDe, formatIsoDateDe } from "@/lib/format";

interface PublicMachineViewProps {
  qrToken: string;
  initialMachine: PublicMachine;
}

export function PublicMachineView({ qrToken, initialMachine }: PublicMachineViewProps) {
  const [machine, setMachine] = useState(initialMachine);
  const [people, setPeople] = useState<PublicPerson[] | null>(null);
  const [peopleError, setPeopleError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const needsPeople = machine.isActive && (machine.status === "IM_LAGER" || machine.status === "AUSGELIEHEN");

  useEffect(() => {
    if (!needsPeople || people !== null) return;
    let cancelled = false;

    fetch(`/api/public/machines/${qrToken}/people`)
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json();
      })
      .then((data: PublicPerson[]) => {
        if (!cancelled) setPeople(data);
      })
      .catch(() => {
        if (!cancelled) setPeopleError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [needsPeople, people, qrToken]);

  function handleCheckoutSuccess(updated: PublicMachine) {
    setMachine(updated);
    setSuccessMessage(uiTexts.publicMachine.checkoutSuccessText);
  }

  function handleCheckinSuccess(updated: PublicMachine) {
    setMachine(updated);
    setSuccessMessage(uiTexts.publicMachine.checkinSuccessText);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="space-y-3 text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{machine.name}</h1>
        <p className="text-gray-500">
          {machine.manufacturer} · {machine.modelName}
        </p>
        <div className="flex justify-center">
          <StatusBadge status={machine.status} />
        </div>
      </header>

      {machine.description && (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
          {machine.description}
        </p>
      )}

      {!machine.isActive && (
        <div className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-6 text-center">
          <p className="text-lg font-semibold text-gray-800">{uiTexts.publicMachine.unavailableTitle}</p>
          <p className="mt-1 text-gray-600">{uiTexts.publicMachine.unavailableText}</p>
        </div>
      )}

      {machine.isActive && successMessage && (
        <div
          role="status"
          className="rounded-xl border border-green-300 bg-green-50 px-4 py-4 text-center text-green-800"
        >
          <p className="font-semibold">{successMessage}</p>
        </div>
      )}

      {machine.isActive && (
        <dl className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
          {machine.status === "IM_LAGER" && machine.storageLocation && (
            <Row label={uiTexts.publicMachine.storageLocationLabel} value={machine.storageLocation} />
          )}
          {machine.informationText && (
            <Row label={uiTexts.publicMachine.informationLabel} value={machine.informationText} />
          )}
          {machine.status === "AUSGELIEHEN" && (
            <>
              <Row label={uiTexts.publicMachine.currentUserLabel} value={machine.currentUserName ?? "–"} />
              <Row
                label={uiTexts.publicMachine.checkoutAtLabel}
                value={formatDateTimeDe(machine.currentCheckoutAt)}
              />
              {machine.currentPlannedReturnDate && (
                <Row
                  label={uiTexts.publicMachine.plannedReturnLabel}
                  value={formatIsoDateDe(machine.currentPlannedReturnDate)}
                />
              )}
              {machine.currentProjectOrLocation && (
                <Row
                  label={uiTexts.publicMachine.projectOrLocationLabel}
                  value={machine.currentProjectOrLocation}
                />
              )}
            </>
          )}
        </dl>
      )}

      {machine.isActive && machine.status === "GESPERRT" && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-6 text-center">
          <p className="font-semibold text-red-800">{uiTexts.publicMachine.lockedNotice}</p>
        </div>
      )}

      {machine.isActive && needsPeople && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {people === null && !peopleError && (
            <p className="text-center text-gray-500">{uiTexts.common.loading}</p>
          )}
          {peopleError && (
            <p role="alert" className="text-center text-red-700">
              {uiTexts.common.genericError}
            </p>
          )}
          {people !== null && machine.status === "IM_LAGER" && (
            <CheckoutForm qrToken={qrToken} people={people} onSuccess={handleCheckoutSuccess} />
          )}
          {people !== null && machine.status === "AUSGELIEHEN" && (
            <CheckinForm qrToken={qrToken} people={people} onSuccess={handleCheckinSuccess} />
          )}
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1 last:border-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
