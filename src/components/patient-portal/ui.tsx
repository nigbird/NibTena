import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Hospital as HospitalIcon, MapPin, Search, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Shared building blocks for the patient portal (/user). Every page composes
// these so spacing, cards, colours and states stay consistent across screens.

/**
 * Admins can paste image URLs from any host, and next/image throws for hosts
 * missing from `images.remotePatterns`. Serve external URLs as-is instead.
 */
export const isExternalImage = (src: string) => /^https?:\/\//i.test(src);

/** Primary call-to-action sizing; pair with `variant="accent"`. */
export const ctaClass = 'h-11 rounded-xl font-semibold';
/** Sizing for Select triggers that sit next to a SearchField. */
export const filterTriggerClass = 'h-11 rounded-xl bg-card shadow-sm';

const pageWidths = {
  wide: 'max-w-6xl',
  medium: 'max-w-3xl',
  narrow: 'max-w-md',
} as const;

export function PageShell({
  size = 'wide',
  className,
  children,
}: {
  size?: keyof typeof pageWidths;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('mx-auto w-full space-y-6 px-4 py-6', pageWidths[size], className)}>{children}</div>;
}

export const PortalCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Card ref={ref} className={cn('rounded-2xl border-0 shadow-sm ring-1 ring-border', className)} {...props} />
  )
);
PortalCard.displayName = 'PortalCard';

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-headline text-lg font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const iconTones = {
  brand: 'bg-secondary/10 text-secondary',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
} as const;

export type Tone = keyof typeof iconTones;

const iconSizes = {
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
  lg: { box: 'h-16 w-16 rounded-2xl', icon: 'h-8 w-8' },
} as const;

export function IconBadge({
  icon: Icon,
  tone = 'brand',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof iconSizes;
  className?: string;
}) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center', iconSizes[size].box, iconTones[tone], className)}>
      <Icon className={iconSizes[size].icon} />
    </div>
  );
}

const pillTones: Record<Tone, string> = {
  brand: 'bg-secondary/10 text-secondary ring-secondary/20',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  muted: 'bg-muted text-muted-foreground ring-border',
};

export function StatusPill({ tone = 'brand', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', pillTones[tone], className)}>
      {children}
    </span>
  );
}

export function SpecialtyPill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-block max-w-full truncate rounded-full bg-primary/25 px-2.5 py-0.5 text-xs font-medium text-secondary', className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <IconBadge icon={icon} tone="muted" size="lg" />
      <h3 className="mt-4 font-headline text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export const SearchField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input ref={ref} type="search" className={cn('h-11 rounded-xl bg-card pl-10 shadow-sm', className)} {...props} />
    </div>
  )
);
SearchField.displayName = 'SearchField';

export const PhoneInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="flex">
      <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        +251
      </span>
      <Input ref={ref} type="tel" className={cn('rounded-l-none', className)} {...props} />
    </div>
  )
);
PhoneInput.displayName = 'PhoneInput';

export function FilterChip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active ? 'border-secondary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted',
        className
      )}
      {...props}
    />
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid rounded-xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all',
            value === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function DetailRow({ icon, label, children }: { icon: LucideIcon; label?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <IconBadge icon={icon} size="sm" />
      <div className="min-w-0 text-sm">
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
        <div className="font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

/** Single-card screens: sign-in, OTP, payment notices, profile forms. */
export function CenteredCard({
  icon,
  tone = 'brand',
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <PageShell size="narrow" className="py-10">
      <PortalCard className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <IconBadge icon={icon} tone={tone} size="lg" />
          <h1 className="mt-4 font-headline text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </PortalCard>
    </PageShell>
  );
}

function RowArrow() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/30 text-secondary transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground">
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

export function DoctorRow({
  doctor,
  href,
  hospitalName,
}: {
  doctor: { name: string; specialty: string; imageUrl?: string | null };
  href: string;
  hospitalName?: string;
}) {
  return (
    <Link href={href} className="group block">
      <PortalCard className="flex items-center gap-4 p-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <Avatar className="h-16 w-16 ring-2 ring-primary/40">
          {doctor.imageUrl && <AvatarImage src={doctor.imageUrl} alt={doctor.name} className="object-cover" />}
          <AvatarFallback className="bg-primary/30 text-lg font-semibold text-secondary">{doctor.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-semibold text-foreground">{doctor.name}</h3>
          <SpecialtyPill>{doctor.specialty}</SpecialtyPill>
          {hospitalName && (
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <HospitalIcon className="h-3.5 w-3.5 shrink-0" /> {hospitalName}
            </p>
          )}
        </div>
        <RowArrow />
      </PortalCard>
    </Link>
  );
}

export function HospitalCard({ hospital }: { hospital: { id: number; name: string; city: string; imageUrl?: string | null } }) {
  return (
    <Link href={`/user/hospitals/${hospital.id}`} className="group block h-full">
      <PortalCard className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {hospital.imageUrl ? (
            <Image
              src={hospital.imageUrl}
              alt={hospital.name}
              fill
              unoptimized={isExternalImage(hospital.imageUrl)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 to-primary/10">
              <HospitalIcon className="h-12 w-12 text-secondary/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
            <MapPin className="h-3 w-3 text-secondary" /> {hospital.city}
          </span>
        </div>
        <div className="flex flex-grow items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="truncate font-headline font-bold">{hospital.name}</h3>
            <p className="text-sm text-muted-foreground">Multi-specialty care</p>
          </div>
          <RowArrow />
        </div>
      </PortalCard>
    </Link>
  );
}
