import React, { useState } from "react";
import type { JSX } from "react";
import type { Media } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { SettingsLabel } from "../../shared";

type MediaKind = "image" | "video" | "audio";

type MediaUrlFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: ({ url }: { url: string }) => void;
  onLibrarySelect: ({ item }: { item: Media }) => void;
  kind: MediaKind;
  placeholder?: string;
  libraryButtonLabel?: string;
};

/**
 * URL input with optional media-library picker — shared by image, video, audio,
 * gallery, cover, and media-text settings panels.
 */
export function MediaUrlField({
  id,
  label,
  value,
  onChange,
  onLibrarySelect,
  kind,
  placeholder,
  libraryButtonLabel = "Choose from library",
}: MediaUrlFieldProps): JSX.Element {
  const [isPickerOpen, setPickerOpen] = useState(false);

  return (
    <div>
      <SettingsLabel htmlFor={id}>{label}</SettingsLabel>
      <div className="mt-1 flex items-center gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
          {libraryButtonLabel}
        </Button>
      </div>
      <MediaPickerDialog
        open={isPickerOpen}
        onOpenChange={setPickerOpen}
        kind={kind}
        onSelect={(item) => {
          onLibrarySelect({ item });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
