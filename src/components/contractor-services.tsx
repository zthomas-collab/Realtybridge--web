import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys, useAction } from "@/lib/hooks";
import {
  CONTRACTOR_OTHER,
  CONTRACTOR_SERVICES,
  addContractorService,
  contractorServiceLabel,
  customServiceName,
} from "@/lib/domain/contractors";
import type { Profile } from "@/lib/types";
import { Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui";

/** Contractor's services (picked from a dropdown, or typed under "Other") and website. Service area = states/counties in Basic info. */
export function ContractorServices({ me }: { me: Profile }) {
  const qc = useQueryClient();
  const [services, setServices] = useState<string[]>(me.contractor_services ?? []);
  const [website, setWebsite] = useState(me.website ?? "");
  const [touched, setTouched] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const otherRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setServices(me.contractor_services ?? []);
    setWebsite(me.website ?? "");
  }, [me.contractor_services, me.website]);

  const error = services.length === 0 ? "Choose at least one service" : null;
  const save = useAction(
    async () => {
      const saved = await api.updateProfile({ contractor_services: services, website: website.trim() || null });
      qc.setQueryData(keys.me, saved);
      return saved;
    },
    { success: "Services saved" },
  );

  const addOther = () => {
    const name = customServiceName(otherText);
    if (!name) return;
    setServices(addContractorService(services, name));
    setOtherText("");
    otherRef.current?.focus();
  };

  return (
    <Card>
      <CardHeader title="Services & contact" description="Investors with deals in your service area see these services with your phone, email and website." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!error) save.mutate(undefined);
        }}
      >
        <CardBody className="space-y-5">
          <Field label="Services I offer" htmlFor="svc" error={touched ? error : null}>
            <Select
              id="svc"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === CONTRACTOR_OTHER) {
                  setOtherOpen(true);
                  otherRef.current?.focus();
                  return;
                }
                if (v) setServices(addContractorService(services, v));
              }}
            >
              <option value="">Add a service…</option>
              {CONTRACTOR_SERVICES.filter((s) => !services.includes(s.value)).map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
              <option value={CONTRACTOR_OTHER}>Other (type your own)…</option>
            </Select>
          </Field>
          {otherOpen && (
            <div className="flex items-end gap-2">
              <Field label="Service name" htmlFor="svc-other" className="flex-1">
                <Input
                  id="svc-other"
                  ref={otherRef}
                  placeholder="e.g. Concrete, Pool service, Security systems"
                  maxLength={40}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOther();
                    }
                  }}
                />
              </Field>
              <Button type="button" variant="secondary" onClick={addOther} disabled={!customServiceName(otherText)}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
          )}
          {services.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {contractorServiceLabel(s)}
                  <button type="button" aria-label={`Remove ${contractorServiceLabel(s)}`} onClick={() => setServices(services.filter((x) => x !== s))}>
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Field label="Website (optional)" htmlFor="website">
            <Input id="website" type="url" placeholder="https://" maxLength={200} value={website} onChange={(e) => setWebsite(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">Your phone and email from Basic info are shared as your contact details.</p>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button type="submit" loading={save.isPending}>Save services</Button>
        </div>
      </form>
    </Card>
  );
}
