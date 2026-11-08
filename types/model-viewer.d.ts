import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  poster?: string;
  alt?: string;
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "manual";
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: string;
  "rotation-per-second"?: string;
  "camera-orbit"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "field-of-view"?: string;
  "shadow-intensity"?: string;
  "shadow-softness"?: string;
  exposure?: string;
  "environment-image"?: string;
  "tone-mapping"?: string;
  "interaction-prompt"?: string;
  "touch-action"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}
