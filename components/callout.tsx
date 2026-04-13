import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

type CalloutType = 'info' | 'warn' | 'warning' | 'error' | 'success';

type CalloutProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'type' | 'icon'
> & {
  title?: ReactNode;
  type?: CalloutType;
  icon?: ReactNode;
};

const borderColors: Record<string, string> = {
  info: 'border-s-blue-500/50',
  warn: 'border-s-orange-500/50',
  error: 'border-s-red-500/50',
  success: 'border-s-green-500/50',
};

const icons: Record<string, ReactNode> = {
  info: <Info className="size-5 fill-blue-500 text-fd-card" />,
  warn: <TriangleAlert className="size-5 fill-orange-500 text-fd-card" />,
  error: <CircleX className="size-5 fill-red-500 text-fd-card" />,
  success: <CircleCheck className="size-5 fill-green-500 text-fd-card" />,
};

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, children, title, type = 'info', icon, ...props }, ref) => {
    const resolved = type === 'warning' ? 'warn' : type;

    return (
      <div
        ref={ref}
        className={cn(
          'my-4 flex gap-2 border border-dashed border-s-2 border-s-solid bg-fd-card p-3 text-sm text-fd-card-foreground shadow-md',
          borderColors[resolved],
          className,
        )}
        {...props}
      >
        {icon ?? icons[resolved]}
        <div className="min-w-0 flex flex-col gap-2 flex-1">
          {title ? <p className="font-medium !my-0">{title}</p> : null}
          <div className="text-fd-muted-foreground prose-no-margin empty:hidden">
            {children}
          </div>
        </div>
      </div>
    );
  },
);

Callout.displayName = 'Callout';
