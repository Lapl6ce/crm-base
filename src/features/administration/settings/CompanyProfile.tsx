import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import type { AppSettings } from '@/data/types';
import { useMutation } from '@/data/useResource';
import { applyAccent, contrastRatio, hexToRgb, tokens } from '@/lib/tokens';
import { useEffect, useState } from 'react';

/* Company profile + the accent colour, which is the client customization hook
 * (CONTEXT.md §4): one settings field writes --color-accent-500/600/100 onto
 * :root and the entire app follows — buttons, focus rings, tags and the hot end
 * of the heat ramp — with no rebuild.
 *
 * The preview is live and immediate: the accent is applied to :root as the
 * picker moves, and reverted if you navigate away without saving. Choosing a
 * brand colour by typing a hex and pressing Save to find out is not choosing.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/* A handful of starting points that all clear 4.5:1 with white text, so the
   common case never lands on an accent that buttons cannot legibly sit on. */
const SUGGESTIONS = ['#FF4E3A', '#C2410C', '#B91C1C', '#1D4ED8', '#0E7C7B', '#6D28D9', '#B45309'];

export interface CompanyProfileProps {
  settings: AppSettings;
  onSave: (patch: { company: Partial<AppSettings['company']>; defaultCurrency?: string }) => Promise<unknown>;
  disabled?: boolean;
}

export function CompanyProfile({ settings, onSave, disabled }: CompanyProfileProps) {
  const [name, setName] = useState(settings.company.name);
  const [accent, setAccent] = useState(settings.company.accentColor);
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const save = useMutation(async (_provider, payload: Parameters<typeof onSave>[0]) => onSave(payload));

  useEffect(() => {
    setName(settings.company.name);
    setAccent(settings.company.accentColor);
    setCurrency(settings.defaultCurrency);
  }, [settings]);

  /* Live preview. The cleanup restores the saved accent, so abandoning the
     screen mid-experiment never leaves the app painted a colour nobody chose. */
  useEffect(() => {
    if (!HEX.test(accent)) return;
    applyAccent(accent);
    return () => {
      applyAccent(settings.company.accentColor);
    };
  }, [accent, settings.company.accentColor]);

  const valid = HEX.test(accent);
  const dirty =
    name !== settings.company.name ||
    accent !== settings.company.accentColor ||
    currency !== settings.defaultCurrency;

  const rgb = valid ? hexToRgb(accent) : null;
  const contrast = rgb ? contrastRatio(rgb, { r: 255, g: 255, b: 255 }) : null;
  const lowContrast = contrast !== null && contrast < 4.5;

  const onReset = () => {
    setName(settings.company.name);
    setAccent(settings.company.accentColor);
    setCurrency(settings.defaultCurrency);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    try {
      await save.run({
        company: { name: name.trim() || settings.company.name, accentColor: accent },
        defaultCurrency: currency.trim() || settings.defaultCurrency,
      });
      toast.success('Company profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save profile');
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <Field label="Company name">
        {({ id }) => (
          <Input
            id={id}
            value={name}
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Corp"
          />
        )}
      </Field>

      <Field label="Default currency" hint="ISO-4217 code used when a deal does not specify one.">
        {({ id }) => (
          <Input
            id={id}
            value={currency}
            disabled={disabled}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            maxLength={3}
            className="w-24 uppercase"
          />
        )}
      </Field>

      <div>
        <Field
          label="Brand accent colour"
          error={!valid ? 'Use a 6-digit hex colour, e.g. #FF4E3A' : undefined}
          hint="Repaints buttons, focus rings, tags and the hot end of the heat ramp instantly across the app."
        >
          {({ id, describedBy, invalid }) => (
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Pick a colour"
                value={valid ? accent : settings.company.accentColor}
                disabled={disabled}
                onChange={(event) => setAccent(event.target.value.toUpperCase())}
                className="h-9 w-10 cursor-pointer rounded border border-ink-200 bg-transparent p-1 disabled:cursor-not-allowed"
              />
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={accent}
                disabled={disabled}
                onChange={(event) => setAccent(event.target.value.toUpperCase())}
                maxLength={7}
                className="w-32 uppercase"
              />
              <div
                className="h-9 flex-1 rounded border border-ink-100 shadow-inner"
                style={{ backgroundColor: valid ? accent : tokens.surface.sunken }}
                aria-hidden="true"
              />
            </div>
          )}
        </Field>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-2xs uppercase tracking-wide text-ink-300">Preset picks:</span>
          {SUGGESTIONS.map((hex) => (
            <button
              key={hex}
              type="button"
              disabled={disabled}
              onClick={() => setAccent(hex)}
              className="h-5 w-5 rounded border border-ink-200 motion-safe:transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed"
              style={{ backgroundColor: hex }}
              aria-label={`Use ${hex}`}
            />
          ))}
        </div>

        {lowContrast && (
          <p className="mt-2 text-xs text-warn-500">
            Contrast with white text is {contrast?.toFixed(1)}:1 (recommended floor is 4.5:1).
            Button labels might be hard to read.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        {dirty && <Tag tone="warn">Unsaved</Tag>}
        {dirty && (
          <Button variant="ghost" size="sm" onClick={onReset} disabled={save.pending}>
            Discard
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          disabled={disabled || !dirty || !valid}
          loading={save.pending}
          className="ml-auto"
        >
          Save profile
        </Button>
      </div>
    </form>
  );
}
