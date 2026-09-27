import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** A file control the user clicks directly, including inside a dialog. */
export function HeroUploadButton({
  label,
  busy = false,
  disabled = false,
  onFile,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const inactive = busy || disabled;
  return (
    <label
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md border border-dashed px-4 py-4 text-sm",
        inactive ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      {busy ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <ImagePlus className="mr-2 size-4" />
      )}
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={inactive}
        className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
