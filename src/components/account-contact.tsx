import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { keys, useAction } from '@/lib/hooks';
import { formatPhoneAsYouType, formatUsPhone, isValidUsPhone } from '@/lib/domain/phone';
import type { Profile } from '@/lib/types';
import { Button, Card, CardBody, CardHeader, Field, Input } from '@/components/ui';

export function AccountContact({ me }: { me: Profile }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(formatUsPhone(me.phone));
  const [touched, setTouched] = useState(false);
  useEffect(() => setPhone(formatUsPhone(me.phone)), [me.phone]);
  const error = !phone ? 'Phone number is required' : !isValidUsPhone(phone) ? 'Enter a valid 10-digit US phone number' : null;
  const save = useAction(async () => {
    const saved = await api.updateProfile({ phone });
    qc.setQueryData(keys.me, saved);
    return saved;
  }, { success: 'Contact information saved' });
  return <Card id="contact" className="scroll-mt-24">
    <CardHeader title="Account contact" />
    <form onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!error) save.mutate(undefined); }}>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact email" htmlFor="contact-email" hint="Your account email">
          <div className="relative"><Mail className="absolute left-3 top-3 size-4 text-muted" /><Input id="contact-email" type="email" value={me.email} readOnly className="pl-9" /></div>
        </Field>
        <Field label="Phone number" htmlFor="contact-phone" error={touched ? error : null}>
          <Input id="contact-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(555) 555-5555" value={phone} aria-invalid={touched && !!error} onChange={(e) => setPhone(formatPhoneAsYouType(e.target.value))} />
        </Field>
      </CardBody>
      <div className="flex justify-end border-t border-border px-5 py-3"><Button type="submit" loading={save.isPending}><Save /> Save contact</Button></div>
    </form>
  </Card>;
}