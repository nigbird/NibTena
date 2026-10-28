
'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Stethoscope, ArrowRight, Building, Heart, Brain, Bone, Baby, Smile, Sparkles, Search, Hospital, CalendarCheck, MapPin, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Hospital as HospitalType, Doctor } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import Autoplay from "embla-carousel-autoplay";
import { type ImagePlaceholder } from '@/lib/placeholder-images';
import { PatientContext } from '@/context/PatientContext';
import { HospitalCard, hideNativeClear, initials } from '@/components/patient-portal/ui';

const actionIcons: { [key: string]: React.ElementType } = {
  Hospital: Hospital,
  Stethoscope: Stethoscope,
  CalendarCheck: CalendarCheck,
  User: UserIcon,
}

const specialtyIcons: { [key: string]: React.ElementType } = {
  Cardiology: Heart,
  Neurology: Brain,
  Pediatrics: Baby,
  Orthopedics: Bone,
  Dentistry: Smile,
  Dermatology: Sparkles,
};


type SearchResult = {
  doctors: PublicDoctor[];
  hospitals: PublicHospital[];
  specialties: string[];
};

function Highlight({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span className="text-foreground/80">{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="text-foreground/80">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="font-bold text-secondary">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
}

type PublicHospital = Pick<HospitalType, 'id' | 'name' | 'city' | 'imageUrl'>;
type PublicDoctor = Pick<Doctor, 'id' | 'name' | 'specialty' | 'imageUrl'>;

type UserHomepageClientProps = {
    heroImage?: ImagePlaceholder;
    quickActions: { href: string; label: string; description: string; icon: string; color: string; }[];
    topHospitals: PublicHospital[];
    featuredDoctors: PublicDoctor[];
    allData: { doctors: PublicDoctor[]; hospitals: PublicHospital[]; specialties: string[] };
    hasMiniAppSession: boolean;
}

export default function UserHomepageClient({ heroImage, quickActions, topHospitals, featuredDoctors, allData, hasMiniAppSession }: UserHomepageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [hospitalApi, setHospitalApi] = useState<any>();
  const [doctorApi, setDoctorApi] = useState<any>();
  const [currentHospitalSlide, setCurrentHospitalSlide] = useState(0);
  const [currentDoctorSlide, setCurrentDoctorSlide] = useState(0);

  const router = useRouter();
  const { patient } = useContext(PatientContext);

  useEffect(() => {
    if (!hospitalApi) return;
    const onSelect = () => {
      setCurrentHospitalSlide(hospitalApi.selectedScrollSnap());
    };
    hospitalApi.on("select", onSelect);
    // Set initial value
    onSelect();
    return () => hospitalApi.off("select", onSelect);
  }, [hospitalApi]);

  useEffect(() => {
    if (!doctorApi) return;
    const onSelect = () => {
      setCurrentDoctorSlide(doctorApi.selectedScrollSnap());
    };
    doctorApi.on("select", onSelect);
    // Set initial value
    onSelect();
    return () => doctorApi.off("select", onSelect);
  }, [doctorApi]);


  useEffect(() => {
    if (debouncedSearchQuery) {
      setShowResults(true);
      setIsSearching(true);
      const lowercasedQuery = debouncedSearchQuery.toLowerCase();
      
      const filteredHospitals = allData.hospitals.filter(h => h.name.toLowerCase().includes(lowercasedQuery));
      const filteredDoctors = allData.doctors.filter(d => d.name.toLowerCase().includes(lowercasedQuery));
      const filteredSpecialties = allData.specialties.filter(s => s.toLowerCase().includes(lowercasedQuery));

      setSearchResults({
        hospitals: filteredHospitals,
        doctors: filteredDoctors,
        specialties: filteredSpecialties,
      });
      setIsSearching(false);
    } else {
      setShowResults(false);
      setSearchResults(null);
    }
  }, [debouncedSearchQuery, allData]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowResults(false);
      router.push(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const handleSuggestionClick = (name: string, url: string) => {
    setSearchQuery(name);
    setShowResults(false);
    router.push(url);
  };
  
  const hasResults = searchResults && (searchResults.doctors.length > 0 || searchResults.hospitals.length > 0 || searchResults.specialties.length > 0);

  const featuredSpecialties = allData.specialties
    .filter((s, i, all) => all.findIndex(o => o.trim().toLowerCase() === s.trim().toLowerCase()) === i)
    .slice(0, 8);

  return (
    <div className="flex flex-col">
      {/* Hero: brand gradient instead of a photo, so text contrast never depends on an image */}
      <div className="relative rounded-b-[2rem] bg-gradient-to-br from-[hsl(var(--primary-foreground))] via-[hsl(28_38%_28%)] to-secondary">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[2rem]">
          <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <Stethoscope className="absolute right-6 top-8 h-28 w-28 rotate-12 text-white/[0.06]" />
        </div>

        <section className="relative mx-auto max-w-3xl px-5 pt-8 pb-24 text-white sm:text-center">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-white/15">
            Book your visit in minutes
          </span>
          <h1 className="mt-4 font-headline text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            How are you feeling <span className="text-primary">today?</span>
          </h1>
          <p className="mt-2 text-white/75">Find trusted doctors and hospitals near you.</p>

          <div className="relative mx-auto mt-6 max-w-xl">
            <form onSubmit={handleSearchSubmit}>
              <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search doctors, hospitals, or specialties…"
                className={cn("h-14 w-full rounded-2xl border-0 bg-card pl-12 pr-4 text-base text-foreground shadow-xl shadow-black/20 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:ring-offset-0", hideNativeClear)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                onFocus={() => { if (debouncedSearchQuery) setShowResults(true); }}
              />
            </form>
            {showResults && (
              <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-card text-left text-foreground shadow-2xl">
                {isSearching ? (
                  <div className="p-4 text-center text-muted-foreground">Searching...</div>
                ) : hasResults ? (
                  <ul className="max-h-96 divide-y overflow-y-auto">
                    {searchResults.specialties.length > 0 && (
                      <>
                        <li className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialties</li>
                        {searchResults.specialties.map(specialty => {
                          const Icon = specialtyIcons[specialty] || Stethoscope;
                          return (
                            <li key={specialty}>
                              <button onClick={() => handleSuggestionClick(specialty, `/user/doctors?specialty=${specialty}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><Icon className="h-4 w-4" /></span>
                                <span className="text-sm font-medium"><Highlight text={specialty} highlight={debouncedSearchQuery} /></span>
                              </button>
                            </li>
                          )
                        })}
                      </>
                    )}
                    {searchResults.hospitals.length > 0 && (
                      <>
                        <li className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hospitals</li>
                        {searchResults.hospitals.map(hospital => (
                          <li key={`h-${hospital.id}`}>
                            <button onClick={() => handleSuggestionClick(hospital.name, `/user/hospitals/${hospital.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60">
                              <Avatar className="h-8 w-8 rounded-lg"><AvatarFallback className="rounded-lg bg-secondary/10 text-secondary"><Building className="h-4 w-4" /></AvatarFallback></Avatar>
                              <div>
                                <p className="text-sm font-medium"><Highlight text={hospital.name} highlight={debouncedSearchQuery} /></p>
                                <p className="text-xs text-muted-foreground">{hospital.city}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </>
                    )}
                    {searchResults.doctors.length > 0 && (
                      <>
                        <li className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Doctors</li>
                        {searchResults.doctors.map(doctor => (
                          <li key={`d-${doctor.id}`}>
                            <button onClick={() => handleSuggestionClick(doctor.name, `/user/doctors/${doctor.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60">
                              <Avatar className="h-8 w-8"><AvatarFallback className="bg-secondary/10 text-secondary">{doctor.name.charAt(0)}</AvatarFallback></Avatar>
                              <div>
                                <p className="text-sm font-medium"><Highlight text={doctor.name} highlight={debouncedSearchQuery} /></p>
                                <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </>
                    )}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No results for "{debouncedSearchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick actions: one floating card overlapping the hero */}
      <section className="relative z-20 -mt-12 px-4">
        <div className={cn(
          "mx-auto grid max-w-4xl divide-x divide-border overflow-hidden rounded-2xl border bg-card shadow-lg shadow-black/5",
          hasMiniAppSession ? "grid-cols-3" : "grid-cols-4"
        )}>
          {quickActions.map(({ href, label, description, icon, color }) => {
            const Icon = actionIcons[icon] || Stethoscope;
            return (
              <Link
                href={href}
                key={label}
                className="group flex flex-col items-center gap-2 px-2 py-4 text-center transition-colors hover:bg-muted/50 sm:flex-row sm:gap-3 sm:px-5 sm:py-5 sm:text-left"
              >
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground", color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground sm:text-sm">{label}</p>
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {featuredSpecialties.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pt-8">
          <SectionHeader title="Browse by specialty" />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredSpecialties.map(specialty => {
              const Icon = specialtyIcons[specialty] || Stethoscope;
              return (
                <Link
                  key={specialty}
                  href={`/user/doctors?specialty=${encodeURIComponent(specialty)}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-secondary/40 hover:bg-secondary/5"
                >
                  <Icon className="h-4 w-4 text-secondary" />
                  {specialty}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl pt-8">
        <div className="px-4">
          <SectionHeader title="Top Hospitals" subtitle="Most booked by patients" href="/user/hospitals" />
        </div>
        <Carousel
          setApi={setHospitalApi}
          opts={{ align: 'start' }}
          plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
          className="w-full"
        >
          <CarouselContent className="-ml-3 px-4">
            {topHospitals.map(hospital => (
              <CarouselItem key={hospital.id} className="basis-[85%] pl-3 sm:basis-1/2 lg:basis-1/3">
                <HospitalCard hospital={hospital} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious variant="brandOutline" className="left-2 hidden shadow-md md:inline-flex" />
          <CarouselNext variant="brandOutline" className="right-2 hidden shadow-md md:inline-flex" />
        </Carousel>
        <SlideDots count={topHospitals.length} current={currentHospitalSlide} onSelect={(i) => hospitalApi?.scrollTo(i)} />
      </section>

      <section className="mx-auto w-full max-w-6xl pt-6 pb-4">
        <div className="px-4">
          <SectionHeader title="Featured Doctors" subtitle="Available for booking" href="/user/doctors" />
        </div>
        <Carousel
          setApi={setDoctorApi}
          opts={{ align: 'start' }}
          plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
          className="w-full"
        >
          <CarouselContent className="-ml-3 px-4">
            {featuredDoctors.map(doctor => (
              <CarouselItem key={doctor.id} className="basis-[46%] pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                <Card className="relative flex h-full flex-col items-center overflow-hidden rounded-2xl border-0 p-4 text-center shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div aria-hidden className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-secondary/10 to-transparent" />
                  <Avatar className="relative mb-3 h-20 w-20 shadow-sm ring-4 ring-card">
                    {doctor.imageUrl && (
                      <AvatarImage src={doctor.imageUrl} alt={doctor.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-secondary/10 text-xl font-semibold text-secondary">{initials(doctor.name)}</AvatarFallback>
                  </Avatar>
                  <div className="mb-3 w-full flex-grow">
                    <h3 title={doctor.name} className="line-clamp-2 text-sm font-bold text-foreground">{doctor.name}</h3>
                    <span className="mt-1 inline-block max-w-full truncate rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary">{doctor.specialty}</span>
                  </div>
                  <Button asChild size="sm" variant="brand" className="h-9 w-full rounded-xl font-semibold">
                    <Link href={`/user/doctors/${doctor.id}`}>Book Now</Link>
                  </Button>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious variant="brandOutline" className="left-2 hidden shadow-md md:inline-flex" />
          <CarouselNext variant="brandOutline" className="right-2 hidden shadow-md md:inline-flex" />
        </Carousel>
        <SlideDots count={featuredDoctors.length} current={currentDoctorSlide} onSelect={(i) => doctorApi?.scrollTo(i)} />
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-headline text-xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/15">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function SlideDots({ count, current, onSelect }: { count: number; current: number; onSelect: (index: number) => void }) {
  if (count < 2) return null;
  return (
    <div className="flex justify-center gap-1.5 py-3">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          aria-label={`Go to slide ${index + 1}`}
          onClick={() => onSelect(index)}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === current ? "w-6 bg-secondary" : "w-1.5 bg-secondary/20"
          )}
        />
      ))}
    </div>
  );
}
