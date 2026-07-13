import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type LinkButtonProps = ComponentProps<typeof Button> & {
  href: string;
  target?: string;
  linkClassName?: string;
  onClick?: () => void;
};

export function LinkButton({ href, children, target, linkClassName, onClick, ...props }: LinkButtonProps) {
  return (
    <Button
      nativeButton={false}
      render={<Link href={href} target={target} className={linkClassName} onClick={onClick} />}
      {...props}
    >
      {children}
    </Button>
  );
}
