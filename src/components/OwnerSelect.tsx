import { forwardRef, type SelectHTMLAttributes } from 'react';
import { useSession } from '@/data/useSession';
import { Select } from './Field';

/* The owner picker, in components/ rather than in a module because contacts,
   companies and (from Phase 3) deals all need the same list of people. It reads
   the user list from useSession, so no caller has to fetch it. */

export interface OwnerSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'onChange' | 'value'> {
  value: string;
  onChange: (userId: string) => void;
  /** The "unset" row. Omit to require a choice. */
  placeholder?: string;
}

export const OwnerSelect = forwardRef<HTMLSelectElement, OwnerSelectProps>(function OwnerSelect(
  { value, onChange, placeholder, ...props },
  ref,
) {
  const { users } = useSession();
  return (
    <Select ref={ref} value={value} onChange={(event) => onChange(event.target.value)} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </Select>
  );
});
