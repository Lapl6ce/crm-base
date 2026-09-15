import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Drawer } from '@/components/Overlay';
import { toast } from '@/components/Toast';
import type { SupplierRecord } from '@/data/types';
import { useEffect, useState } from 'react';

export interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
  supplier?: SupplierRecord | null;
  onSave: (data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function SupplierForm({ open, onClose, supplier, onSave }: SupplierFormProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Semiconductors');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [rating, setRating] = useState(4.5);
  const [activeContracts, setActiveContracts] = useState(1);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setCode(supplier.code);
      setCategory(supplier.category);
      setContactPerson(supplier.contactPerson);
      setEmail(supplier.email);
      setPhone(supplier.phone);
      setPaymentTerms(supplier.paymentTerms);
      setRating(supplier.rating);
      setActiveContracts(supplier.activeContracts);
      setCity(supplier.city);
      setCountry(supplier.country);
    } else {
      setName('');
      setCode(`SUP-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('Semiconductors');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setPaymentTerms('Net 30');
      setRating(4.5);
      setActiveContracts(1);
      setCity('');
      setCountry('United States');
    }
  }, [supplier, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Supplier company name is required');
      return;
    }

    onSave({
      name: name.trim(),
      code: code.trim(),
      category,
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      paymentTerms,
      rating: Number(rating),
      activeContracts: Number(activeContracts),
      city: city.trim(),
      country: country.trim(),
    });

    toast.success(supplier ? 'Supplier updated' : 'Supplier registered');
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={supplier ? 'Edit Supplier Record' : 'Register New Supplier'}
      description="Maintain verified supplier credentials, commercial payment terms, and vendor point-of-contact."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Supplier Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Microdevices"
              required
            />
          </Field>
          <Field label="Supplier Code" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SUP-001"
              required
            />
          </Field>
        </div>

        <Field label="Category / Commodity">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Semiconductors">Semiconductors</option>
            <option value="Chassis & Metalwork">Chassis & Metalwork</option>
            <option value="Optical Networking">Optical Networking</option>
            <option value="Batteries & Power">Batteries & Power</option>
            <option value="Machining & Assemblies">Machining & Assemblies</option>
            <option value="Firmware & SBCs">Firmware & SBCs</option>
            <option value="Thermal Management">Thermal Management</option>
            <option value="Sensors & MEMS">Sensors & MEMS</option>
            <option value="Logistics Partner">Logistics Partner</option>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary Contact Person">
            <Input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Full Name"
            />
          </Field>
          <Field label="Contact Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@supplier.com"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 0192"
            />
          </Field>
          <Field label="Payment Terms">
            <Select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Yokohama"
            />
          </Field>
          <Field label="Country">
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Japan"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quality / Reliability Rating (1-5)">
            <Input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
          </Field>
          <Field label="Active Contracts">
            <Input
              type="number"
              min="0"
              value={activeContracts}
              onChange={(e) => setActiveContracts(Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-ink-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {supplier ? 'Save Changes' : 'Register Supplier'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
