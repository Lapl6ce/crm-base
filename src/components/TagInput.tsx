import { useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { Tag } from './Tag';

/* Tag editor, shared by the contact and company forms.
 *
 * Enter or comma commits; Backspace on an empty input removes the last tag.
 * Tags are lowercased and de-duplicated on the way in — "VIP" and "vip" being
 * two different filter chips is a papercut that compounds over a few thousand
 * records.
 */

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags across the collection, offered as a datalist. */
  suggestions?: string[];
  placeholder?: string;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  max?: number;
}

const normalize = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, ' ');

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add a tag…',
  id,
  describedBy,
  invalid,
  max = 12,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = id ? `${id}-suggestions` : undefined;

  const commit = (raw: string) => {
    const tag = normalize(raw);
    if (!tag || value.includes(tag) || value.length >= max) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter must not submit the form while the user is still adding tags.
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const unused = suggestions.filter((tag) => !value.includes(tag));

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded border border-ink-150 bg-surface-card px-2 py-1.5',
        'motion-safe:transition-colors hover:border-ink-300',
        invalid && 'border-danger-600',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => onChange(value.filter((t) => t !== tag))}>
          {tag}
        </Tag>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={draft}
        list={listId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length >= max ? `Limit ${max} tags` : placeholder}
        disabled={value.length >= max}
        className="min-w-[8rem] flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-300 disabled:cursor-not-allowed"
      />
      {listId && unused.length > 0 && (
        <datalist id={listId}>
          {unused.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}
    </div>
  );
}
