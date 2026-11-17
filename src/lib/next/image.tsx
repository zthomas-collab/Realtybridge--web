import type { ImgHTMLAttributes } from "react";

export default function Image({ priority: _p, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) {
  return <img {...props} />;
}
