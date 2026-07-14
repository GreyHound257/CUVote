"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ProfileFields = {
  manifesto?: string | null;
  slogan?: string | null;
  visionStatement?: string | null;
  photoUrl?: string | null;
};

export function CandidateForm({
  candidateId,
  initialData,
  onSuccess,
}: {
  candidateId: string;
  initialData?: ProfileFields;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    manifesto: initialData?.manifesto || "",
    slogan: initialData?.slogan || "",
    visionStatement: initialData?.visionStatement || "",
    photoUrl: initialData?.photoUrl || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifesto: formData.manifesto || null,
          slogan: formData.slogan || null,
          visionStatement: formData.visionStatement || null,
          photoUrl: formData.photoUrl || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Candidate profile saved");
        onSuccess();
      } else {
        toast.error(json.error || "Failed to save profile");
      }
    } catch {
      toast.error("Failed to save profile");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="slogan">Campaign Slogan</Label>
        <Input
          id="slogan"
          value={formData.slogan}
          onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
          placeholder="Enter a catchy slogan"
          className="rounded-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vision">Vision Statement</Label>
        <Textarea
          id="vision"
          value={formData.visionStatement}
          onChange={(e) =>
            setFormData({ ...formData, visionStatement: e.target.value })
          }
          placeholder="What does this candidate hope to achieve?"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="manifesto">Manifesto</Label>
        <Textarea
          id="manifesto"
          value={formData.manifesto}
          onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
          placeholder="Detailed campaign manifesto"
          rows={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="photo">Photo URL</Label>
        <Input
          id="photo"
          value={formData.photoUrl}
          onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
          placeholder="https://example.com/photo.jpg"
          className="rounded-full"
        />
      </div>
      <Button type="submit" disabled={loading} className="rounded-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  );
}
