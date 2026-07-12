"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CandidateForm({ candidateId, initialData, onSuccess }: { candidateId: string, initialData?: any, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    manifesto: initialData?.manifesto || "",
    slogan: initialData?.slogan || "",
    photoUrl: initialData?.photoUrl || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Campaign Slogan</label>
        <Input
          value={formData.slogan}
          onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
          placeholder="Enter a catchy slogan"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Manifesto</label>
        <Textarea
          value={formData.manifesto}
          onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
          placeholder="Detailed campaign manifesto"
          rows={6}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Photo URL</label>
        <Input
          value={formData.photoUrl}
          onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
          placeholder="https://example.com/photo.jpg"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
