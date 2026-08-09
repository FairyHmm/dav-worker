import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// twMerge's default config only knows Tailwind's stock class names. Our
// text-host-* size scale collides with text-host-* color classes under
// its `text-*` ambiguity handling — without this, twMerge silently drops
// whichever one it can't classify (usually the size), since it treats
// unrecognized text-* utilities as belonging to the same conflict group
// as text color. Any future host-namespaced group with the same
// text-*/bg-*/etc. overlap risk needs the same registration here.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-host-2xs",
        "text-host-xs",
        "text-host-sm",
        "text-host-md",
        "text-host-lg",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
