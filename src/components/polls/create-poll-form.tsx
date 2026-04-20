"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPoll } from "@/lib/actions/polls";
import { toast } from "sonner";

interface CreatePollFormProps {
  roles: { id: string; name: string; slug: string }[];
  tiers: { id: string; name: string; level: number }[];
}

export function CreatePollForm({ roles, tiers }: CreatePollFormProps) {
  const router = useRouter();
  const [options, setOptions] = useState(["", ""]);
  const [targetRoleSlugs, setTargetRoleSlugs] = useState<string[]>([]);
  const [showTargeting, setShowTargeting] = useState(false);
  const [loading, setLoading] = useState(false);

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      // Append targeted role slugs as hidden fields
      for (const slug of targetRoleSlugs) {
        formData.append("targetRoleSlugs", slug);
      }
      const pollId = await createPoll(formData);
      toast.success("Poll created");
      router.push(`/polls/${pollId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create poll");
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="What should we decide?" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Provide additional context for voters..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAnonymous"
          name="isAnonymous"
          className="h-4 w-4 rounded border"
        />
        <Label htmlFor="isAnonymous">Anonymous poll (voters&apos; identities are hidden)</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxVotes">Votes per member</Label>
        <select
          id="maxVotes"
          name="maxVotes"
          defaultValue="1"
          className="w-full rounded border bg-background px-3 py-2 text-sm"
        >
          <option value="1">1 (single choice)</option>
          <option value="2">Up to 2</option>
          <option value="3">Up to 3</option>
          <option value="4">Up to 4</option>
          <option value="5">Up to 5</option>
          <option value="0">Unlimited</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Options (minimum 2)</Label>
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              name="options"
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              required
            />
            {options.length > 2 && (
              <Button type="button" variant="outline" size="sm" onClick={() => removeOption(i)}>
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          Add Option
        </Button>
      </div>

      {/* Targeting */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showTargeting"
            checked={showTargeting}
            onChange={(e) => setShowTargeting(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <Label htmlFor="showTargeting">Restrict who can vote</Label>
        </div>

        {showTargeting && (
          <div className="ml-6 space-y-3 rounded border p-3">
            {roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Require one of these roles:</Label>
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`target-role-${role.slug}`}
                      checked={targetRoleSlugs.includes(role.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetRoleSlugs([...targetRoleSlugs, role.slug]);
                        } else {
                          setTargetRoleSlugs(targetRoleSlugs.filter((s) => s !== role.slug));
                        }
                      }}
                      className="h-4 w-4 rounded border"
                    />
                    <Label htmlFor={`target-role-${role.slug}`} className="text-sm font-normal">
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {tiers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="targetMinTierLevel" className="text-sm">Minimum tier level (optional):</Label>
                <select
                  id="targetMinTierLevel"
                  name="targetMinTierLevel"
                  defaultValue=""
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any tier</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.level}>
                      {tier.name} (level {tier.level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {roles.length === 0 && tiers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No roles or tiers configured. Create them in the admin panel first.
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Poll"}
      </Button>
    </form>
  );
}
