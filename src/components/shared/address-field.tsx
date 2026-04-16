"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddressValue {
  postcode: string;
  line1: string;
  line2: string;
  town: string;
}

interface AddressFieldProps {
  name: string;
  label: string;
  required: boolean;
  helpText?: string;
  defaultValue?: AddressValue;
  onChange?: (value: AddressValue) => void;
}

export function AddressField({
  name,
  label,
  required,
  helpText,
  defaultValue,
  onChange,
}: AddressFieldProps) {
  const [postcode, setPostcode] = useState(defaultValue?.postcode ?? "");
  const [line1, setLine1] = useState(defaultValue?.line1 ?? "");
  const [line2, setLine2] = useState(defaultValue?.line2 ?? "");
  const [town, setTown] = useState(defaultValue?.town ?? "");
  const [checking, setChecking] = useState(false);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [manualEntry, setManualEntry] = useState(false);
  const [eligibility, setEligibility] = useState<{
    checked: boolean;
    valid: boolean;
    eligible: boolean;
  }>({ checked: false, valid: false, eligible: false });

  const addressComplete = !!(postcode.trim() && line1.trim() && town.trim());
  const serialized = JSON.stringify({ postcode, line1, line2, town });

  const notifyChange = useCallback(
    (updates: Partial<AddressValue>) => {
      const value = {
        postcode,
        line1,
        line2,
        town,
        ...updates,
      };
      onChange?.(value);
    },
    [postcode, line1, line2, town, onChange],
  );

  async function checkPostcode() {
    const trimmed = postcode.trim();
    if (!trimmed) return;

    setChecking(true);
    setAddresses([]);
    setManualEntry(false);
    try {
      const res = await fetch(
        `/api/postcode-check?postcode=${encodeURIComponent(trimmed)}`,
      );
      if (!res.ok) {
        console.error("Postcode check failed:", res.status, res.statusText);
        setEligibility({ checked: true, valid: false, eligible: false });
        return;
      }
      const data = await res.json();
      setEligibility({
        checked: true,
        valid: data.valid ?? false,
        eligible: data.eligible ?? false,
      });
      if (data.postcode) {
        setPostcode(data.postcode);
        notifyChange({ postcode: data.postcode });
      }
      if (data.addresses?.length > 0) {
        setAddresses(data.addresses);
        if (data.town) {
          setTown(data.town);
          notifyChange({ postcode: data.postcode, town: data.town });
        }
      } else if (data.valid) {
        // Valid postcode but no address list — show manual entry
        setManualEntry(true);
      }
    } catch {
      setEligibility({ checked: true, valid: false, eligible: false });
    } finally {
      setChecking(false);
    }
  }

  function handleAddressSelect(selected: string) {
    setLine1(selected);
    setLine2("");
    notifyChange({ line1: selected, line2: "" });
  }

  const showDropdown = addresses.length > 0 && !manualEntry;
  const showManualFields =
    manualEntry || (eligibility.checked && eligibility.valid && addresses.length === 0);

  return (
    <div className="space-y-3">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}

      {/* Postcode with check button */}
      <div className="space-y-2">
        <Label htmlFor={`${name}-postcode`} className="text-sm">
          Postcode
        </Label>
        <div className="flex gap-2">
          <Input
            id={`${name}-postcode`}
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value);
              setEligibility({ checked: false, valid: false, eligible: false });
              setAddresses([]);
              setManualEntry(false);
              notifyChange({ postcode: e.target.value });
            }}
            placeholder="e.g. G69 8FD"
            className="flex-1"
            required={required}
          />
          <Button
            type="button"
            variant="outline"
            onClick={checkPostcode}
            disabled={checking || !postcode.trim()}
          >
            {checking ? "Checking..." : "Find Address"}
          </Button>
        </div>

        {eligibility.checked && (
          <div
            className={`text-sm rounded-md px-3 py-2 ${
              !eligibility.valid
                ? "bg-destructive/10 text-destructive"
                : eligibility.eligible
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {!eligibility.valid
              ? "Please enter a valid UK postcode."
              : eligibility.eligible
                ? "Eligible for full membership."
                : "This postcode is not in the eligible area. You can still apply as an Associate Member."}
          </div>
        )}
      </div>

      {/* Address dropdown when addresses are available */}
      {showDropdown && (
        <div className="space-y-2">
          <Label htmlFor={`${name}-select`} className="text-sm">
            Select your address
          </Label>
          <Select
            onValueChange={handleAddressSelect}
            value={line1}
          >
            <SelectTrigger id={`${name}-select`}>
              <SelectValue placeholder={`${addresses.length} addresses found...`} />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((addr) => (
                <SelectItem key={addr} value={addr}>
                  {addr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => setManualEntry(true)}
          >
            My address isn&apos;t listed
          </button>
        </div>
      )}

      {/* Manual address entry — shown when no dropdown or user opts out */}
      {(manualEntry || showManualFields) && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${name}-line1`} className="text-sm">
              Address line 1
            </Label>
            <Input
              id={`${name}-line1`}
              value={line1}
              onChange={(e) => {
                setLine1(e.target.value);
                notifyChange({ line1: e.target.value });
              }}
              required={required}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${name}-line2`} className="text-sm">
              Address line 2
            </Label>
            <Input
              id={`${name}-line2`}
              value={line2}
              onChange={(e) => {
                setLine2(e.target.value);
                notifyChange({ line2: e.target.value });
              }}
            />
          </div>
        </>
      )}

      {/* Town — shown after postcode check, pre-filled if available */}
      {eligibility.checked && eligibility.valid && (
        <div className="space-y-2">
          <Label htmlFor={`${name}-town`} className="text-sm">
            Town / City
          </Label>
          <Input
            id={`${name}-town`}
            value={town}
            onChange={(e) => {
              setTown(e.target.value);
              notifyChange({ town: e.target.value });
            }}
            required={required}
          />
        </div>
      )}

      {/* Hidden input with serialized JSON for form submission */}
      <input type="hidden" name={name} value={serialized} />
      {/* Validation input — blocks form submission if address is incomplete */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="absolute h-0 w-0 opacity-0"
          required
          value={addressComplete ? "complete" : ""}
          onChange={() => {}}
          onInvalid={(e) => {
            (e.target as HTMLInputElement).setCustomValidity(
              !postcode.trim()
                ? "Please enter your postcode and click Find Address"
                : !line1.trim()
                  ? "Please select or enter your address"
                  : "Please enter your town or city",
            );
          }}
          onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
        />
      )}
    </div>
  );
}
