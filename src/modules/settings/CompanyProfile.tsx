import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useMutation } from '@/data/useResource';
import type { AppSettings } from '@/data/types';
import { applyAccent, contrastRatio, hexToRgb, tokens } from '@/lib/tokens';

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

  /* White text on the accent is what every primary button is, so the ratio is
     worth stating rather than leaving someone to discover it in production. */
  const rgb = valid ? hexToRgb(accent) : null;
  const white = hexToRgb('#FFFFFF')!;
  const buttonContrast = rgb ? contrastRatio(rgb, white) : 0;

  const onSubmit = async () => {
    if (!valid || !name.trim()) return;
    try {
      await save.run({
        company: { name: name.trim(), accentColor: accent },
        defaultCurrency: currency.trim().toUpperCase() || 'USD',
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save those settings');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={!name.trim() ? 'A name is required' : undefined}>
          {({ id, invalid }) => (
            <Input
              id={id}
              aria-invalid={invalid}
              value={name}
              disabled={disabled}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your company"
            />
          )}
        </Field>
        <Field label="Default currency" hint="ISO code — new deals start here.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={currency}
              disabled={disabled}
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              className="uppercase"
            />
          )}
        </Field>
      </div>

      <Field
        label="Accent colour"
        error={!valid ? 'Use a six-digit hex, like #FF4E3A' : undefined}
        hint={
          valid
            ? `White text on this reads at ${buttonContrast.toFixed(1)}:1${
                buttonContrast < 4.5 ? ' — below 4.5:1, so button labels will be hard to read' : ''
              }`
            : undefined
        }
      >
        {({ id, describedBy, invalid }) => (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={valid ? accent : tokens.accent[500]}
              disabled={disabled}
              onChange={(event) => setAccent(event.target.value.toUpperCase())}
              aria-label="Pick an accent colour"
              className="h-9 w-12 cursor-pointer rounded border border-ink-150 bg-surface-card p-1"
            />
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={accent}
              disabled={disabled}
              onChange={(event) => setAccent(event.target.value.toUpperCase())}
              className="w-32 font-mono uppercase"
            />
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  disabled={disabled}
                  onClick={() => setAccent(hex)}
                  aria-label={`Use ${hex}`}
                  title={hex}
                  className="h-6 w-6 rounded border border-ink-150"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}
      </Field>

      {/* The preview is the real components, not swatches — the point is to see
          what a button and a focus ring will actually look like. */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-ink-100 bg-surface-app p-3">
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-300">Preview</span>
        <Button variant="primary" size="sm">
          Primary action
        </Button>
        <Tag tone="accent">Needs attention</Tag>
        <span aria-hidden="true" className="h-6 w-[3px] rounded-full bg-accent-500" />
        <span className="text-xs text-ink-500">Heat stripe, at its hottest</span>
      </div>

      <div className="flex items-center gap-2">
        {dirty && <Tag tone="warn">Unsaved</Tag>}
        <div className="ml-auto flex gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              disabled={save.pending}
              onClick={() => {
                setName(settings.company.name);
                setAccent(settings.company.accentColor);
                setCurrency(settings.defaultCurrency);
              }}
            >
              Discard
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={disabled || !dirty || !valid || !name.trim()}
            loading={save.pending}
          >
            Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}
