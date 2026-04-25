"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveCsvMapping, importTransactions } from "@/lib/actions/financials";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { CsvMapping } from "@/lib/config";

interface Category {
  name: string;
  type: string;
}

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  included: boolean;
  duplicate: boolean;
  raw: string[];
}

interface CsvImportProps {
  existingMapping: CsvMapping | null;
  categories: Category[];
  existingTransactions: { date: Date; amount: number; description: string }[];
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

function parseDate(value: string, format: string): string | null {
  const cleaned = value.trim();
  try {
    if (format === "DD/MM/YYYY") {
      const [d, m, y] = cleaned.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (format === "YYYY-MM-DD") return cleaned;
    if (format === "MM/DD/YYYY") {
      const [m, d, y] = cleaned.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // Try native parsing
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return null;
}

function parsePence(value: string): number {
  const cleaned = value.replace(/[£$,\s]/g, "").replace(/[()]/g, "-");
  return Math.round(parseFloat(cleaned) * 100);
}

export function CsvImport({ existingMapping, categories, existingTransactions }: CsvImportProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">(
    existingMapping ? "upload" : "upload",
  );
  const [rawData, setRawData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CsvMapping>(
    existingMapping ?? {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      dateFormat: "DD/MM/YYYY",
      hasHeader: true,
    },
  );
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultCategory, setDefaultCategory] = useState("Uncategorised");
  const [loading, setLoading] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setRawData(rows);

      if (existingMapping) {
        // Auto-parse with existing mapping
        applyMapping(rows, existingMapping);
        setStep("preview");
      } else {
        setStep("map");
      }
    };
    reader.readAsText(file);
  }

  function applyMapping(rows: string[][], m: CsvMapping) {
    const dataRows = m.hasHeader ? rows.slice(1) : rows;

    const parsed: ParsedRow[] = dataRows
      .map((row) => {
        const dateStr = parseDate(row[m.dateColumn] ?? "", m.dateFormat);
        if (!dateStr) return null;

        let amount: number;
        let type: "income" | "expense";

        if (m.creditColumn !== undefined && m.debitColumn !== undefined) {
          const credit = row[m.creditColumn]?.trim();
          const debit = row[m.debitColumn]?.trim();
          if (credit && parsePence(credit) > 0) {
            amount = parsePence(credit);
            type = "income";
          } else if (debit && parsePence(debit) > 0) {
            amount = parsePence(debit);
            type = "expense";
          } else {
            return null;
          }
        } else {
          const rawAmount = parsePence(row[m.amountColumn] ?? "0");
          if (rawAmount === 0) return null;
          amount = Math.abs(rawAmount);
          type = rawAmount > 0 ? "income" : "expense";
        }

        const description = row[m.descriptionColumn] ?? "";

        // Check for duplicates
        const duplicate = existingTransactions.some(
          (t) =>
            t.amount === amount &&
            t.description.toLowerCase() === description.toLowerCase() &&
            new Date(t.date).toISOString().slice(0, 10) === dateStr,
        );

        return {
          date: dateStr,
          description,
          amount,
          type,
          category: defaultCategory,
          included: !duplicate,
          duplicate,
          raw: row,
        } as ParsedRow;
      })
      .filter(Boolean) as ParsedRow[];

    setParsedRows(parsed);
  }

  function handleApplyMapping() {
    applyMapping(rawData, mapping);
    setStep("preview");
  }

  async function handleSaveMappingAndContinue() {
    setLoading(true);
    try {
      await saveCsvMapping(mapping);
      toast.success("Column mapping saved");
      applyMapping(rawData, mapping);
      setStep("preview");
    } catch {
      toast.error("Failed to save mapping");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(index: number) {
    setParsedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, included: !r.included } : r)),
    );
  }

  function setRowCategory(index: number, category: string) {
    setParsedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, category } : r)),
    );
  }

  function applyDefaultCategory() {
    setParsedRows((prev) =>
      prev.map((r) => (r.category === "Uncategorised" ? { ...r, category: defaultCategory } : r)),
    );
  }

  async function handleImport() {
    const toImport = parsedRows
      .filter((r) => r.included)
      .map((r) => ({
        date: r.date,
        type: r.type,
        category: r.category,
        description: r.description,
        amount: r.amount,
        reference: "CSV Import",
      }));

    if (toImport.length === 0) {
      toast.error("No transactions selected");
      return;
    }

    setLoading(true);
    try {
      const count = await importTransactions(toImport);
      setImportCount(count);
      setStep("done");
      toast.success(`Imported ${count} transactions`);
    } catch {
      toast.error("Failed to import");
    } finally {
      setLoading(false);
    }
  }

  const formatPence = (p: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

  // ── Step: Upload ──
  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Bank Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file downloaded from your bank. {existingMapping ? "Your column mapping from last time will be used automatically." : "You'll map the columns on the next step."}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => fileRef.current?.click()}>
            Choose CSV File
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Step: Map columns ──
  if (step === "map") {
    const headers = rawData[0] ?? [];
    const sampleRow = rawData[1] ?? [];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Map Columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell us which columns contain the date, description, and amount.
          </p>

          {headers.length > 0 && (
            <div className="overflow-x-auto rounded border p-2 text-xs">
              <p className="font-medium mb-1">Preview (first row):</p>
              <div className="flex gap-4">
                {headers.map((h, i) => (
                  <div key={i} className="min-w-[100px]">
                    <p className="font-medium">Col {i}: {h}</p>
                    <p className="text-muted-foreground">{sampleRow[i] ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasHeader"
              checked={mapping.hasHeader}
              onChange={(e) => setMapping({ ...mapping, hasHeader: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="hasHeader">First row is a header</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date column</Label>
              <Input
                type="number"
                min={0}
                value={mapping.dateColumn}
                onChange={(e) => setMapping({ ...mapping, dateColumn: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date format</Label>
              <Select
                value={mapping.dateFormat}
                onValueChange={(v) => setMapping({ ...mapping, dateFormat: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description column</Label>
              <Input
                type="number"
                min={0}
                value={mapping.descriptionColumn}
                onChange={(e) => setMapping({ ...mapping, descriptionColumn: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount column (single +/- column)</Label>
              <Input
                type="number"
                min={0}
                value={mapping.amountColumn}
                onChange={(e) => setMapping({ ...mapping, amountColumn: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            If your bank uses separate credit and debit columns, set them below (leave amount column for the primary).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Credit column (optional)</Label>
              <Input
                type="number"
                min={-1}
                value={mapping.creditColumn ?? -1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setMapping({ ...mapping, creditColumn: v >= 0 ? v : undefined });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Debit column (optional)</Label>
              <Input
                type="number"
                min={-1}
                value={mapping.debitColumn ?? -1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setMapping({ ...mapping, debitColumn: v >= 0 ? v : undefined });
                }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleApplyMapping}>Preview</Button>
            <Button variant="outline" onClick={handleSaveMappingAndContinue} disabled={loading}>
              {loading ? "Saving..." : "Save Mapping & Preview"}
            </Button>
            <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Step: Preview ──
  if (step === "preview") {
    const included = parsedRows.filter((r) => r.included);
    const duplicates = parsedRows.filter((r) => r.duplicate);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>{parsedRows.length} parsed</span>
            <span className="text-green-600">{included.length} selected</span>
            {duplicates.length > 0 && (
              <span className="text-amber-600">{duplicates.length} potential duplicates</span>
            )}
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Default category for uncategorised</Label>
              <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uncategorised">Uncategorised</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={applyDefaultCategory}>Apply</Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {parsedRows.map((row, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded border p-2 text-sm ${
                  row.duplicate ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : ""
                } ${!row.included ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={() => toggleRow(i)}
                  className="h-4 w-4 rounded border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{row.description}</p>
                  <p className="text-xs text-muted-foreground">{row.date}</p>
                </div>
                <Select
                  value={row.category}
                  onValueChange={(v) => setRowCategory(i, v)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uncategorised">Uncategorised</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={`shrink-0 font-semibold text-sm ${row.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {row.type === "income" ? "+" : "-"}{formatPence(row.amount)}
                </span>
                {row.duplicate && <Badge variant="outline" className="text-xs shrink-0">Duplicate?</Badge>}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={loading || included.length === 0}>
              {loading ? "Importing..." : `Import ${included.length} Transactions`}
            </Button>
            <Button variant="outline" onClick={() => setStep(existingMapping ? "upload" : "map")}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Step: Done ──
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold">Import Complete</h2>
        <p className="text-muted-foreground">
          {importCount} transaction{importCount !== 1 ? "s" : ""} imported successfully.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => router.push("/financials")}>
            View Financials
          </Button>
          <Button variant="outline" onClick={() => { setStep("upload"); setParsedRows([]); setRawData([]); }}>
            Import Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
